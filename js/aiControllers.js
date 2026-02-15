import { state } from './gameContext.js';

export function detectClumping(target, allTanks) {
    const radius = 100;
    const tx = target.x + target.width / 2;
    const ty = target.y - target.height / 2;

    const enemiesNearTarget = allTanks.filter(t => {
        if (!t.alive || t === target) return false;
        const dx = (t.x + t.width / 2) - tx;
        const dy = (t.y - t.height / 2) - ty;
        return Math.sqrt(dx * dx + dy * dy) < radius;
    });

    return enemiesNearTarget.length >= 2;
}

const AI_SOLVER_GUARDS = Object.freeze({
    MAX_SOLVER_TIME_MS: 26,
    MAX_EXHAUSTIVE_TIME_MS: 45, // absolute cap per solver invocation
    MAX_SHOT_EVALUATIONS: 3400,
    MAX_TRAJECTORY_TICKS: 900,
    MAX_SUBSTEPS_PER_TICK: 70
});

// Helper to simulate shots and find the best parameters within constraints
function findBestShot(tank, target, env, angleMin, angleMax, powerMin = 10, powerMax = 100, preference = 'any', weaponRadius = 15, initialAngleStep = Math.PI / 20, initialPowerStep = 10, refinedSteps = 10, exhaustive = false) {
    const g = env.gravity;
    const physicsScale = 0.2; 
    const barrelLength = 30;

    const tx = target.x + target.width / 2;
    const ty = target.y - target.height / 2;

    let bestAngle = null;
    let bestPower = null;
    let minError = Infinity;
    let bestCriteria = (preference === 'steepest' ? -Infinity : Infinity);
    const solverStart = Date.now();
    const externalDeadline = Number.isFinite(env?.aiDeadline) ? env.aiDeadline : null;
    const localBudget = exhaustive ? AI_SOLVER_GUARDS.MAX_EXHAUSTIVE_TIME_MS : AI_SOLVER_GUARDS.MAX_SOLVER_TIME_MS;
    const localDeadline = solverStart + localBudget;
    const hardDeadline = externalDeadline !== null
        ? Math.min(externalDeadline, solverStart + AI_SOLVER_GUARDS.MAX_EXHAUSTIVE_TIME_MS)
        : localDeadline;
    const maxEvaluations = exhaustive
        ? AI_SOLVER_GUARDS.MAX_SHOT_EVALUATIONS * 2
        : AI_SOLVER_GUARDS.MAX_SHOT_EVALUATIONS;
    let evaluations = 0;

    const shouldAbort = () => {
        if (Date.now() >= hardDeadline) return true;
        if (evaluations >= maxEvaluations) return true;
        return false;
    };

    const safeAngleStep = (Number.isFinite(initialAngleStep) && initialAngleStep > 0) ? initialAngleStep : (Math.PI / 20);
    const safePowerStep = (Number.isFinite(initialPowerStep) && initialPowerStep > 0) ? initialPowerStep : 10;
    const safeRefinedSteps = (Number.isFinite(refinedSteps) && refinedSteps > 0) ? refinedSteps : 10;

    const checkBetter = (error, angle, peakY, power) => {
        const hitThreshold = 10;

        // PRIORITY 1: Absolute Accuracy (If we haven't found a 'hit' yet, take the closest shot)
        if (error < minError) return true; 

        // PRIORITY 2: Character Preference (Only apply if both are within hit threshold)
        if (error <= hitThreshold && minError <= hitThreshold) {
            if (preference === 'flattest') {
                if (power < bestPower - 10) return true;
                return peakY > bestCriteria; 
            }
            if (preference === 'steepest') return peakY < bestCriteria;
            if (power < bestPower - 10) return true;
        }

        return false;
    };

    // Phase 1: Coarse Search with Early Exit
    coarseLoop: for (let power = powerMin; power <= powerMax; power += safePowerStep) {
        for (let angle = angleMin; angle <= angleMax; angle += safeAngleStep) {
            if (shouldAbort()) break coarseLoop;
            const res = simulateSingleTrajectory(tank, target, env, angle, power, g, physicsScale, barrelLength, tx, ty, weaponRadius);
            evaluations++;
             
            // PRIORITY: Absolute Accuracy (If we haven't found a 'hit' yet, take the closest shot)
            // A 'hit' candidate is anything within 10px or anything significantly better than current best.
            if (res.hitX && (res.error < 10 || checkBetter(res.error, angle, res.peakY, power))) {
                minError = res.error;
                bestAngle = angle;
                bestPower = power;
                bestCriteria = res.peakY;

                // EARLY EXIT: Only stop if we found a near-perfect hit (within 2px)
                if (minError < 2) break coarseLoop;
            }
        }
    }

    // Phase 2: Refined Search
    if (bestAngle !== null) {
        const refineAngleRange = safeAngleStep;
        const refinePowerRange = safePowerStep;
        const powerIncrement = Math.max(0.25, refinePowerRange / safeRefinedSteps);
        const angleIncrement = Math.max((Math.PI / 720), refineAngleRange / safeRefinedSteps);

        refineLoop: for (let power = Math.max(powerMin, bestPower - refinePowerRange); power <= Math.min(powerMax, bestPower + refinePowerRange); power += powerIncrement) {
            for (let angle = Math.max(angleMin, bestAngle - refineAngleRange); angle <= Math.min(angleMax, bestAngle + refineAngleRange); angle += angleIncrement) {
                if (shouldAbort()) break refineLoop;
                const res = simulateSingleTrajectory(tank, target, env, angle, power, g, physicsScale, barrelLength, tx, ty, weaponRadius);
                evaluations++;
                if (res.hitX && checkBetter(res.error, angle, res.peakY, power)) {
                    minError = res.error;
                    bestAngle = angle;
                    bestPower = power;
                    bestCriteria = res.peakY;
                }
            }
        }
    }
    
    return { angle: bestAngle, power: bestPower, error: minError };
}

function simulateSingleTrajectory(tank, target, env, angle, power, g, physicsScale, barrelLength, tx, ty, weaponRadius = 15) {
    let x = tank.x + tank.width / 2 + barrelLength * Math.cos(angle);
    let y = tank.y - tank.height - barrelLength * Math.sin(angle);
    
    // SYNC WITH GAME PHYSICS: Apply safe starting distance "teleport"
    const safeStartingDistance = weaponRadius + 20;
    const tankCenterX = tank.x + tank.width/2;
    const tankCenterY = tank.y - tank.height/2;
    const distanceFromTankCenterToProjectile = Math.sqrt(
        (x - tankCenterX)**2 + (y - tankCenterY)**2
    );
    
    if (distanceFromTankCenterToProjectile > 0 && distanceFromTankCenterToProjectile < safeStartingDistance) {
        const safetyFactor = safeStartingDistance / distanceFromTankCenterToProjectile;
        x = tankCenterX + (x - tankCenterX) * safetyFactor;
        y = tankCenterY + (y - tankCenterY) * safetyFactor;
    }

    let vx = power * Math.cos(angle) * physicsScale;
    let vy = -power * Math.sin(angle) * physicsScale;
    
    let minDistance = Infinity;
    let peakY = y;
    let foundPromisingPath = false;

    let totalSubSteps = 0;
    for(let t = 0; t < AI_SOLVER_GUARDS.MAX_TRAJECTORY_TICKS; t++) {
        vy += g;
        vx += env.wind;
        
        if (y < peakY) peakY = y;

        const speed = Math.sqrt(vx*vx + vy*vy);
        const rawSteps = Math.ceil(speed / 2);
        const steps = Math.min(AI_SOLVER_GUARDS.MAX_SUBSTEPS_PER_TICK, Math.max(1, rawSteps));
        const stepX = vx / steps;
        const stepY = vy / steps;
        
        for (let s = 0; s < steps; s++) {
            x += stepX;
            y += stepY;
            totalSubSteps++;
            
            // TRACK CLOSEST APPROACH
            const dist = Math.sqrt((x - tx)**2 + (y - ty)**2);
            if (dist < minDistance) minDistance = dist;

            // DISCOVERY PERSISTENCE: If we pass within 150px of the target X, mark as promising.
            if (Math.abs(x - tx) < 150) foundPromisingPath = true;

            // EDGE AWARE SIMULATION
            if (state.activeEdgeBehavior === 'reflect') {
                if (x <= 0) { vx = Math.abs(vx); x = 0; }
                if (x >= (state.canvas?.width || 1200)) { vx = -Math.abs(vx); x = (state.canvas?.width || 1200); }
                if (y <= 0) { vy = Math.abs(vy); y = 0; }
            } else if (state.activeEdgeBehavior === 'teleport') {
                if (x < 0) x = (state.canvas?.width || 1200);
                else if (x > (state.canvas?.width || 1200)) x = 0;
            }

            // COLLISION IMMUNITY: Don't hit terrain for the first 10 sub-steps (allow clearing the tank/floor)
            if (totalSubSteps > 10) {
                if (env.checkTerrain && env.checkTerrain(x, y)) {
                    return { hitX: foundPromisingPath, error: minDistance, peakY };
                }
            }
        }

        // Off-screen checks
        if (y > 2000 || x < -500 || x > 2500) break; 
    }
    return { hitX: true, error: minDistance, peakY };
}

export class AIController {
    constructor() {
        this.shotsAgainstTarget = new Map(); // targetName -> count
    }

    calculateShot(tank, target, env) {
        throw new Error('calculateShot must be implemented by subclass');
    }

    shop(store, tank, allTanks = null) {
        // Default: random chance to buy affordable items
        if (Math.random() > 0.3) return; 
        
        const affordable = store.items.filter(i => i.price <= tank.currency);
        if (affordable.length === 0) return;
        
        const item = affordable[Math.floor(Math.random() * affordable.length)];
        store.buyItem(item.id);
    }

    getShotHistory(target) {
        return this.shotsAgainstTarget.get(target.name) || 0;
    }

    recordShot(target) {
        const count = this.getShotHistory(target);
        this.shotsAgainstTarget.set(target.name, count + 1);
    }

    onShotResult(target, impactX, impactY) {
        // Default: do nothing
    }

    chooseTarget(tank, allTanks) {
        // Default: Random alive target that isn't self
        const targets = allTanks.filter(t => t !== tank && t.alive);
        if (targets.length === 0) return null;
        return targets[Math.floor(Math.random() * targets.length)];
    }

    clampAngle(angle) {
        if (!Number.isFinite(angle)) return Math.PI / 4;
        return Math.max(2 * Math.PI / 180, Math.min(178 * Math.PI / 180, angle));
    }

    planLaserShot(tank, target, env, angleBias = 0, powerBias = 0) {
        if (!tank || !target) return null;
        const barrelLength = 35;
        const originX = tank.x + tank.width / 2 + barrelLength * Math.cos(tank.angle ?? (Math.PI / 4));
        const originY = tank.y - tank.height - barrelLength * Math.sin(tank.angle ?? (Math.PI / 4));
        const tx = target.x + target.width / 2;
        const ty = target.y - target.height / 2;
        const dx = tx - originX;
        const dy = ty - originY;
        const distance = Math.sqrt((dx * dx) + (dy * dy));
        const maxDist = 2000;
        const step = 2;

        const aimedAngle = this.clampAngle(Math.atan2(-dy, dx) + angleBias);
        if (!Number.isFinite(distance) || distance <= 0) {
            return { angle: aimedAngle, power: 40, error: 180, canHit: false, terrainCost: 0, requiredPower: 100 };
        }

        const probeDist = Math.min(distance, maxDist);
        const steps = Math.max(1, Math.ceil(probeDist / step));
        let terrainCost = 0;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = originX + (dx * t);
            const y = originY + (dy * t);
            if (env?.checkTerrain && env.checkTerrain(x, y)) terrainCost += 1;
        }

        const rawRequiredPower = (terrainCost + 3) / 1.9;
        const canHit = distance <= maxDist && rawRequiredPower <= 100;
        const power = Math.max(10, Math.min(100, Math.max(30, rawRequiredPower + 8) + powerBias));
        const error = canHit
            ? Math.min(35, terrainCost * 0.35)
            : (130 + Math.max(0, rawRequiredPower - 100) * 2 + Math.max(0, distance - maxDist) * 0.2);

        return {
            angle: aimedAngle,
            power,
            error,
            canHit,
            terrainCost,
            requiredPower: rawRequiredPower,
            distance
        };
    }

    shouldUseLaserAsFallback(tank, target, env, bestNonLaserError = Infinity) {
        const laser = this.planLaserShot(tank, target, env);
        if (!laser?.canHit) return false;
        if (!Number.isFinite(bestNonLaserError)) return true;
        return bestNonLaserError >= 55 || (laser.error + 12 < bestNonLaserError);
    }

    planShot(tank, target, env, weaponId = 'default', angleBias = 0, powerBias = 0) {
        if (weaponId === 'laser') {
            const laser = this.planLaserShot(tank, target, env, angleBias, powerBias);
            if (laser) return { angle: laser.angle, power: laser.power, error: laser.error };
        }

        const weapon = this.getWeaponProfile(tank, weaponId);
        const tankX = tank.x + tank.width / 2;
        const targetX = target.x + target.width / 2;
        const dx = targetX - tankX;
        const edgeMode = state.activeEdgeBehavior || 'impact';
        const canvasWidth = state.canvas?.width || 1200;
        const now = Date.now();
        const requestedDeadline = Number.isFinite(env?.aiDeadline) ? env.aiDeadline : (now + 120);
        const hardDeadline = Math.min(requestedDeadline, now + 140);
        const planningEnv = Number.isFinite(env?.aiDeadline) && env.aiDeadline === hardDeadline
            ? env
            : { ...env, aiDeadline: hardDeadline };
        const isTimeUp = () => Date.now() >= hardDeadline;
        const nativeRight = dx >= 0;
        
        // 1. Define Tactical Profiles based on Edge Rules
        const profiles = [{ name: 'standard', rightSide: nativeRight, bias: 0 }];
        if (edgeMode === 'teleport' && canvasWidth > 0) {
            const wrappedDx = this.getWrappedDx(dx, canvasWidth);
            const wrappedRight = wrappedDx >= 0;
            profiles.unshift({ name: 'teleport-wrap', rightSide: wrappedRight, bias: -10 });
        } else if (edgeMode === 'reflect') {
            // In reflect mode, the opposite wall is always a tactical option.
            profiles.push({ name: 'trick-reflect', rightSide: !nativeRight, bias: -4 });
        }

        let best = null;
        for (const p of profiles) {
            if (isTimeUp()) break;
            const candidate = this.searchProfile(tank, target, planningEnv, weapon, p.rightSide);
            if (!candidate) continue;
            
            const score = candidate.error + p.bias;
            if (!best || score < best.score) {
                best = { ...candidate, score };
            }
        }

        // Dedicated reflect lane: force evaluation of ceiling-bounce angles when reflect mode is active.
        if (edgeMode === 'reflect' && (!best || best.error > 12) && !isTimeUp()) {
            const minPower = weapon.speedMultiplier > 1 ? 10 : 20;
            const maxPower = weapon.speedMultiplier > 1 ? 85 : 100;
            const reflectArc = findBestShot(
                tank,
                target,
                planningEnv,
                68 * Math.PI / 180,
                112 * Math.PI / 180,
                minPower,
                maxPower,
                'steepest',
                weapon.radius,
                Math.PI / 90,
                2,
                12
            );
            if (reflectArc.angle !== null) {
                const reflectScore = reflectArc.error - 6;
                if (!best || reflectScore < best.score) {
                    best = { ...reflectArc, rightSide: Math.cos(reflectArc.angle) >= 0, score: reflectScore };
                }
            }
        }

        // 2. High-Density Discovery Fallback (The 'Eye of the Needle' search)
        // If no reasonable path was found, OR the target is deeply buried, we MUST perform an exhaustive search.
        const isTargetDeep = target.y > 650;
        if ((!best || best.error > 35 || isTargetDeep) && !isTimeUp()) {
            const exhaustiveRes = findBestShot(
                tank, target, planningEnv, 5 * Math.PI / 180, 175 * Math.PI / 180, 
                10, 100, 'any', weapon.radius, Math.PI / 150, 1, 40, true // EXHAUSTIVE: Ignore guards
            );
            if (exhaustiveRes.angle !== null && (!best || exhaustiveRes.error < best.error)) {
                best = { ...exhaustiveRes, rightSide: Math.cos(exhaustiveRes.angle) >= 0 };
            }
        }

        // 3. Last Resort: Character Baseline
        if (!best) {
            best = {
                angle: nativeRight ? Math.PI/4 : 3*Math.PI/4,
                power: 70,
                error: Infinity,
                rightSide: nativeRight
            };
        }

        return this.finalizeShot(best, angleBias, powerBias, best.rightSide, tank, env, weapon);
    }

    searchProfile(tank, target, env, weapon, rightSide) {
        const minPower = weapon.speedMultiplier > 1 ? 10 : 20;
        const maxPower = weapon.speedMultiplier > 1 ? 85 : 100;
        const dMin = rightSide ? 5 * Math.PI/180 : 95 * Math.PI/180;
        const dMax = rightSide ? 85 * Math.PI/180 : 175 * Math.PI / 180;
        const lMin = rightSide ? 50 * Math.PI / 180 : 92 * Math.PI / 180;
        const lMax = rightSide ? 88 * Math.PI / 180 : 130 * Math.PI / 180;

        // Try Direct
        const direct = findBestShot(tank, target, env, dMin, dMax, minPower, maxPower, 'flattest', weapon.radius, Math.PI / 20, 10, 20);
        if (direct.angle !== null && direct.error < 15) return direct;

        // Try Lob
        const lob = findBestShot(tank, target, env, lMin, lMax, minPower, maxPower, 'steepest', weapon.radius, Math.PI / 20, 10, 20);
        if (lob.angle !== null && (lob.error < 15 || !direct.angle)) return lob;

        return (direct.angle !== null && (direct.error < (lob.error || Infinity))) ? direct : (lob.angle !== null ? lob : null);
    }

    getWrappedDx(dx, canvasWidth) {
        if (!canvasWidth || !Number.isFinite(canvasWidth)) return dx;
        return dx - Math.round(dx / canvasWidth) * canvasWidth;
    }

    scorePlannedShot(candidate, bias = 0) {
        const error = Number.isFinite(candidate.error) ? candidate.error : 250;
        const power = Number.isFinite(candidate.power) ? candidate.power : 70;
        const powerPenalty = power * 0.12;
        const trajectoryPenalty = candidate.trajectory === 'lob' ? 3 : 0;
        return error + powerPenalty + trajectoryPenalty + bias;
    }

    finalizeShot(best, angleBias, powerBias, rightSide, tank, env, weapon) {
        let angle = (best.angle ?? (rightSide ? 45 * Math.PI / 180 : 135 * Math.PI / 180)) + angleBias;
        let power = (best.power ?? 70) + powerBias;

        let safety = 0;
        while (this.detectSelfHarm(tank, env, angle, power, weapon.radius) && safety < 6) {
            angle += (Math.PI / 36) * (rightSide ? 1 : -1);
            safety += 1;
        }

        const boundedAngle = Math.max(2 * Math.PI / 180, Math.min(178 * Math.PI / 180, angle));
        const boundedPower = Math.max(10, Math.min(100, power));
        return { angle: boundedAngle, power: boundedPower, error: best.error ?? Infinity };
    }

    getWeaponProfile(tank, weaponId) {
        if (weaponId === 'default') return { radius: 15, damage: 50, speedMultiplier: 1 };
        const item = tank.inventory?.find(i => i.id === weaponId);
        return {
            radius: item?.effect?.radius || 15,
            damage: item?.effect?.damage || 50,
            speedMultiplier: item?.effect?.speedMultiplier || 1
        };
    }

    detectSelfHarm(tank, env, angle, power, weaponRadius = 15) {
        const physicsScale = 0.2;
        const barrelLength = 30;
        let x = tank.x + tank.width / 2 + barrelLength * Math.cos(angle);
        let y = tank.y - tank.height - barrelLength * Math.sin(angle);

        const safeStartingDistance = weaponRadius + 20;
        const tankCenterX = tank.x + tank.width / 2;
        const tankCenterY = tank.y - tank.height / 2;
        const dist = Math.sqrt((x - tankCenterX)**2 + (y - tankCenterY)**2);
        if (dist > 0 && dist < safeStartingDistance) {
            x = tankCenterX + (x - tankCenterX) * (safeStartingDistance / dist);
            y = tankCenterY + (y - tankCenterY) * (safeStartingDistance / dist);
        }

        let vx = power * Math.cos(angle) * physicsScale;
        let vy = -power * Math.sin(angle) * physicsScale;

        for (let t = 0; t < 35; t++) {
            vy += env.gravity;
            vx += env.wind;
            x += vx; y += vy;
            if (env.checkTerrain && env.checkTerrain(x, y)) {
                if (Math.sqrt((x - tankCenterX)**2 + (y - tankCenterY)**2) < 65) return true;
            }
        }
        return false;
    }
}

export class StandardAI extends AIController {
    constructor(difficulty = 'medium') {
        super();
        this.difficulty = difficulty;
        this.lastTarget = null;
    }

    shop(store, tank, allTanks = null) {
        // Standard AI: 50% chance to shop
        if (Math.random() > 0.5) return;

        const affordable = store.items.filter(i => i.price <= tank.currency);
        if (affordable.length === 0) return;

        // Prioritize healing if low health
        if (tank.health < 50) {
            const health = affordable.find(i => i.effect.type === 'healing');
            if (health) {
                store.buyItem(health.id);
                return;
            }
        }

        // Proactive Parachute
        if (tank.currency >= 50 && tank.parachuteDurability === 0 && Math.random() < 0.1) {
            store.buyItem('parachute');
            return;
        }

        // Hard/Medium buying logic
        if (this.difficulty === 'hard') {
            if (tank.currency >= 350 && Math.random() < 0.3) {
                store.buyItem('earthquake_l');
                return;
            }
            if (tank.currency >= 150 && Math.random() < 0.2) {
                store.buyItem('blockbuster');
                return;
            }
            if (tank.currency >= 50 && Math.random() < 0.5) {
                store.buyItem('heavy');
                return;
            }
        }
        
        if (this.difficulty === 'medium') {
            if (tank.currency >= 150 && Math.random() < 0.1) {
                store.buyItem('blockbuster');
                return;
            }
            if (tank.currency >= 50 && Math.random() < 0.2) {
                store.buyItem('heavy');
                return;
            }
        }

        // Random otherwise
        const item = affordable[Math.floor(Math.random() * affordable.length)];
        store.buyItem(item.id);
    }

    chooseWeapon(tank, target, allTanks) {
        // Hard bots use best available
        if (this.difficulty === 'hard') {
            if (tank.inventory.find(i => i.id === 'earthquake_l')) return 'earthquake_l';
            if (tank.inventory.find(i => i.id === 'titan_shell')) return 'titan_shell';
            if (tank.inventory.find(i => i.id === 'blockbuster')) return 'blockbuster';
            if (tank.inventory.find(i => i.id === 'heavy')) return 'heavy';
        }
        // Medium bots use good available
        if (this.difficulty === 'medium') {
            if (tank.inventory.find(i => i.id === 'blockbuster')) return 'blockbuster';
            if (tank.inventory.find(i => i.id === 'heavy')) return 'heavy';
        }
        return 'default';
    }

    chooseTarget(tank, allTanks) {
        if (this.lastTarget && this.lastTarget.alive && Math.random() > 0.3) {
            return this.lastTarget;
        }
        const newTarget = super.chooseTarget(tank, allTanks);
        this.lastTarget = newTarget;
        return newTarget;
    }

    calculateShot(tank, target, env) {
        // Get radius for simulation sync
        const weaponItem = tank.inventory.find(i => i.id === tank.selectedWeapon);
        const weaponRadius = weaponItem?.effect?.radius || 15;

        const result = findBestShot(tank, target, env, 5 * Math.PI/180, 175 * Math.PI/180, 10, 100, 'any', weaponRadius);
        
        let bestAngle = result.angle || Math.PI / 4;
        let bestPower = result.power || 70;

        let errorScale = 1.0;
        if (this.difficulty === 'easy') errorScale = 2.0;
        if (this.difficulty === 'hard') errorScale = 0.5;

        const history = this.getShotHistory(target);
        const learningFactor = Math.max(0.1, 1.0 - (history * 0.3));
        
        const angleError = (Math.random() * 2 - 1) * (Math.PI / 180) * 5 * errorScale * learningFactor;
        const powerError = (Math.random() * 2 - 1) * 5 * errorScale * learningFactor;
        
        return {
            angle: bestAngle + angleError,
            power: Math.max(10, Math.min(100, bestPower + powerError))
        };
    }
}

export class StupidAI extends AIController {
    shop(store, tank, allTanks = null) {
        // Stupid: Loves chaos (Cluster, Nuke)
        if (tank.currency >= 150 && Math.random() < 0.5) {
            store.buyItem('cluster_bomb');
            return;
        }
        if (tank.currency >= 500 && Math.random() < 0.5) {
            store.buyItem('mega_nuke');
            return;
        }

        // Randomly buy things
        if (Math.random() < 0.5) {
            const affordable = store.items.filter(i => i.price <= tank.currency);
            if (affordable.length > 0) {
                const item = affordable[Math.floor(Math.random() * affordable.length)];
                store.buyItem(item.id);
            }
        }
    }

    chooseWeapon(tank, target, allTanks) {
        // Randomly pick a weapon from inventory
        const weapons = tank.inventory.filter(i => i.effect.type === 'weapon');
        if (weapons.length > 0 && Math.random() < 0.5) {
            return weapons[Math.floor(Math.random() * weapons.length)].id;
        }
        return 'default';
    }

    calculateShot(tank, target, env) {
        // Stupid: Random everything, no constraints
        let angle = Math.random() * Math.PI;
        const power = 10 + Math.random() * 90;
        return { angle, power };
    }
}

export class LobberAI extends AIController {
    shop(store, tank, allTanks = null) {
        if (tank.currency >= 500) store.buyItem('mega_nuke');
        else if (tank.currency >= 350) store.buyItem('earthquake_l');
        else if (tank.currency >= 120) store.buyItem('earthquake_m');
        else if (tank.currency >= 50) store.buyItem('heavy');
    }

    chooseWeapon(tank, target, allTanks) {
        if (tank.inventory.find(i => i.id === 'mega_nuke')) return 'mega_nuke';
        if (tank.inventory.find(i => i.id === 'earthquake_l')) return 'earthquake_l';
        return 'default';
    }

    calculateShot(tank, target, env) {
        const weaponId = tank.selectedWeapon || 'default';
        const dx = target.x - tank.x;
        const right = dx > 0;
        
        // Lobbers strictly stay in high lob range (60-88 deg) and prefer STEEPEST
        const lobMin = right ? 60 * Math.PI / 180 : 92 * Math.PI / 180;
        const lobMax = right ? 88 * Math.PI / 180 : 120 * Math.PI / 180;
        
        const result = findBestShot(tank, target, env, lobMin, lobMax, 20, 100, 'steepest', 15, Math.PI / 30, 10, 30);
        
        const history = this.getShotHistory(target);
        const learning = Math.max(0.1, 1.0 - (history * 0.25));
        const noise = (Math.random() * 2 - 1) * 1.5 * learning;

        return {
            angle: (result.angle || (lobMin + lobMax)/2) + (noise * Math.PI / 180),
            power: Math.max(10, Math.min(100, (result.power || 70) + noise * 1.5))
        };
    }
}

export class SniperAI extends AIController {
    shop(store, tank, allTanks = null) {
        if (tank.currency >= 50 && !tank.inventory.find(i => i.id === 'heavy')) store.buyItem('heavy');
        else if (tank.currency >= 40 && !tank.inventory.find(i => i.id === 'laser') && Math.random() < 0.25) store.buyItem('laser');
    }

    chooseWeapon(tank, target, allTanks, env = null) {
        const simEnv = env || {
            wind: state.wind,
            gravity: state.gravity,
            checkTerrain: (x, y) => state.terrain?.checkCollision ? state.terrain.checkCollision(x, y) : false
        };
        const hasHeavy = !!tank.inventory.find(i => i.id === 'heavy');
        const hasLaser = !!tank.inventory.find(i => i.id === 'laser');
        const directRadius = hasHeavy ? 30 : 15;
        const hasDirectLane = this.hasViableDirectShot(tank, target, simEnv, directRadius);

        // Sniper policy: use conventional shell when direct lane exists.
        if (hasHeavy && hasDirectLane) return 'heavy';

        // If direct lanes are blocked, prefer laser utility if it can actually tunnel to target.
        if (hasLaser) {
            const laser = this.planLaserShot(tank, target, simEnv);
            if (laser?.canHit && !hasDirectLane) return 'laser';

            const baseline = this.planShot(tank, target, simEnv, 'default', 0, 0);
            const baselineError = Number.isFinite(baseline.error) ? baseline.error : 220;
            if (!hasHeavy && this.shouldUseLaserAsFallback(tank, target, simEnv, baselineError)) return 'laser';
        }

        if (hasHeavy) return 'heavy';
        return 'default';
    }

    hasViableDirectShot(tank, target, env, weaponRadius = 15) {
        const tankX = tank.x + tank.width / 2;
        const targetX = target.x + target.width / 2;
        const right = targetX >= tankX;
        const angleMin = right ? (6 * Math.PI / 180) : (138 * Math.PI / 180);
        const angleMax = right ? (42 * Math.PI / 180) : (174 * Math.PI / 180);
        const direct = findBestShot(
            tank,
            target,
            env,
            angleMin,
            angleMax,
            55,
            100,
            'flattest',
            weaponRadius,
            Math.PI / 36,
            5,
            18
        );
        return direct.angle !== null && Number.isFinite(direct.error) && direct.error <= 26;
    }

    calculateShot(tank, target, env) {
        const weaponId = tank.selectedWeapon || 'default';
        const history = this.getShotHistory(target);
        if (weaponId === 'laser') {
            const laser = this.planLaserShot(tank, target, env);
            if (laser) {
                const openingAngleJitterDeg = history === 0 ? 0.38 : (history === 1 ? 0.24 : 0.1);
                const openingPowerJitter = history === 0 ? 1.5 : (history === 1 ? 0.9 : 0.4);
                const noise = (Math.random() * 2 - 1) * openingAngleJitterDeg * Math.PI / 180;
                return {
                    angle: this.clampAngle(laser.angle + noise),
                    power: Math.max(10, Math.min(100, laser.power + ((Math.random() * 2 - 1) * openingPowerJitter)))
                };
            }
        }
        const weapon = this.getWeaponProfile(tank, weaponId);
        
        // Snipers prefer flat direct shots at high power.
        const result = findBestShot(tank, target, env, 5 * Math.PI / 180, 175 * Math.PI / 180, 70, 100, 'flattest', weapon.radius, Math.PI / 30, 5, 25);
        
        const openingAngleJitterDeg = history === 0 ? 0.55 : (history === 1 ? 0.34 : 0.14);
        const openingPowerJitter = history === 0 ? 1.9 : (history === 1 ? 1.2 : 0.5);
        const angleNoise = (Math.random() * 2 - 1) * openingAngleJitterDeg;
        const powerNoise = (Math.random() * 2 - 1) * openingPowerJitter;
        
        return {
            angle: (result.angle || Math.PI / 4) + (angleNoise * Math.PI / 180),
            power: Math.max(70, Math.min(100, (result.power || 85) + powerNoise))
        };
    }
}

export class NemesisAI extends AIController {
    constructor() {
        super();
        this.currentTarget = null;
        this.adjustments = new Map(); // targetName -> { angleBias, powerBias }
        this.lastShotDirection = new Map(); // targetName -> 1 | -1
        this.pendingWeaponId = null;
        this.pendingWeaponTarget = null;
    }

    shop(store, tank, allTanks = null) {
        const affordable = store.items.filter(i => i.price <= tank.currency);
        if (affordable.length === 0) return;
        const isPureNemesis = this.constructor === NemesisAI;

        if (tank.health <= 55) {
            const health = affordable.find(i => i.id === 'health');
            if (health) { store.buyItem('health'); return; }
        }

        if (isPureNemesis) {
            const context = this.buildBattlefieldContext(state.tanks || [tank], null);
            const quakePressure = this.getQuakePressureScore(context, null);
            if (quakePressure >= 38) {
                if (affordable.find(i => i.id === 'earthquake_l')) { store.buyItem('earthquake_l'); return; }
                if (affordable.find(i => i.id === 'earthquake_m')) { store.buyItem('earthquake_m'); return; }
            }
        }

        const priorities = ['mega_nuke', 'titan_shell', 'earthquake_l', 'blockbuster', 'cluster_bomb', 'earthquake_m', 'heavy', 'laser'];
        for (const itemId of priorities) {
            const item = affordable.find(i => i.id === itemId);
            if (item) { store.buyItem(itemId); return; }
        }
    }

    chooseTarget(tank, allTanks) {
        const targets = allTanks.filter(t => t !== tank && t.alive);
        if (targets.length === 0) return null;

        const tankX = tank.x + tank.width / 2;
        let bestTarget = targets[0];
        let bestScore = -Infinity;

        for (const candidate of targets) {
            const candidateX = candidate.x + candidate.width / 2;
            const distance = Math.max(1, Math.abs(candidateX - tankX));
            const distanceScore = 260 / (distance + 60);
            const healthScore = (100 - candidate.health) * 1.4;
            const clumpBonus = detectClumping(candidate, allTanks) ? 28 : 0;
            const elevationBonus = Math.max(0, 380 - candidate.y) * 0.16;
            const shieldPenalty = candidate.shieldDurability > 0 ? 18 : 0;
            const score = distanceScore + healthScore + clumpBonus + elevationBonus - shieldPenalty;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = candidate;
            }
        }

        this.currentTarget = bestTarget;
        return bestTarget;
    }

    chooseWeapon(tank, target, allTanks, env = null) {
        const isPureNemesis = this.constructor === NemesisAI;
        if (isPureNemesis && this.pendingWeaponId && this.pendingWeaponTarget === target?.name) {
            const pending = this.pendingWeaponId;
            this.pendingWeaponId = null;
            this.pendingWeaponTarget = null;
            if (pending === 'default' || (tank.inventory || []).some(i => i.id === pending)) {
                return pending;
            }
        }

        return this.computeBestWeapon(tank, target, allTanks, env);
    }

    computeBestWeapon(tank, target, allTanks, env = null) {
        const weapons = (tank.inventory || []).filter(i => i.effect?.type === 'weapon');
        const unique = Array.from(new Map(weapons.map(w => [w.id, w])).values());
        const options = [{ id: 'default', price: 0, effect: { radius: 15, damage: 50 } }, ...unique];
        const simEnv = env || {
            wind: state.wind,
            gravity: state.gravity,
            checkTerrain: (x, y) => state.terrain?.checkCollision ? state.terrain.checkCollision(x, y) : false
        };
        const now = Date.now();
        const weaponDeadline = Number.isFinite(simEnv.aiDeadline) ? simEnv.aiDeadline : (now + 120);
        const evalEnv = Number.isFinite(simEnv.aiDeadline) && simEnv.aiDeadline === weaponDeadline
            ? simEnv
            : { ...simEnv, aiDeadline: weaponDeadline };

        const targetX = target.x + target.width / 2;
        const targetY = target.y - target.height / 2;
        const tankX = tank.x + tank.width / 2;
        const tankY = tank.y - tank.height / 2;
        const clumped = detectClumping(target, allTanks);
        const context = this.buildBattlefieldContext(allTanks, target);
        const quakePressure = this.getQuakePressureScore(context, target);
        const selfDistToTarget = Math.sqrt((targetX - tankX) ** 2 + (targetY - tankY) ** 2);

        const hasWeapon = (id) => (tank.inventory || []).some(i => i.id === id);
        if (quakePressure >= 82 && context.aliveCount >= 5) {
            if (hasWeapon('earthquake_l') && selfDistToTarget > 210) {
                return 'earthquake_l';
            }
            if (hasWeapon('earthquake_m') && selfDistToTarget > 130) {
                return 'earthquake_m';
            }
        }

        let bestId = 'default';
        let bestScore = -Infinity;
        const defaultPlan = this.planShot(tank, target, evalEnv, 'default', 0, 0);
        const defaultError = Number.isFinite(defaultPlan.error) ? defaultPlan.error : 220;

        for (const weapon of options) {
            if (Date.now() >= weaponDeadline) break;
            const profile = this.getWeaponProfile(tank, weapon.id);
            const radius = profile.radius;
            const damage = profile.damage;
            const price = weapon.price || 0;
            const count = weapon.id === 'default'
                ? Number.POSITIVE_INFINITY
                : (tank.inventory || []).filter(i => i.id === weapon.id).length;

            const shot = this.planShot(tank, target, evalEnv, weapon.id, 0, 0);
            const error = Number.isFinite(shot.error) ? shot.error : 220;
            const hitFactor = Math.max(0, 1 - (error / (radius + 35)));
            let score = hitFactor * damage * 1.2;

            let splashScore = 0;
            for (const other of allTanks) {
                if (!other.alive || other === tank) continue;
                const otherX = other.x + other.width / 2;
                const otherY = other.y - other.height / 2;
                const dist = Math.sqrt((targetX - otherX) ** 2 + (targetY - otherY) ** 2);
                if (dist <= radius) {
                    const splashFactor = 1 - (dist / radius);
                    splashScore += damage * splashFactor * (other === target ? 1 : 0.65);
                }
            }
            score += splashScore;

            if (clumped && radius >= 40) score += 26;
            if (target.health <= damage) score += 18;
            if (error < 14) score += 12;

            if (weapon.id === 'earthquake_m') {
                score += quakePressure * 1.25;
            } else if (weapon.id === 'earthquake_l') {
                score += quakePressure * 1.55;
            }

            const selfDist = Math.sqrt((targetX - tankX) ** 2 + (targetY - tankY) ** 2);
            if (selfDist < radius + 20) {
                score -= (radius + 20 - selfDist) * 2.5;
            }
            if (selfDist < radius * 0.85) {
                score -= 260;
            }
            if (selfDist < radius * 0.65) {
                score -= 420;
            }
            if ((weapon.id === 'earthquake_m' || weapon.id === 'earthquake_l') && selfDist < radius * 1.05) {
                score -= 220;
            }

            if (weapon.id !== 'default') {
                score -= price * (count <= 1 ? 0.07 : 0.03);
                if (count <= 1 && target.health > damage * 1.3) score -= 10;
            }

            if (weapon.id === 'laser') {
                const laser = this.planLaserShot(tank, target, evalEnv);
                if (!laser?.canHit) {
                    score -= 180;
                } else {
                    score -= 42; // only use laser when other lines are poor
                    if (this.shouldUseLaserAsFallback(tank, target, evalEnv, defaultError)) {
                        score += 36;
                    } else {
                        score -= 22;
                    }
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestId = weapon.id;
            }
        }

        return bestId;
    }

    calculateShot(tank, target, env) {
        const isPureNemesis = this.constructor === NemesisAI;
        const current = this.adjustments.get(target.name) || { angleBias: 0, powerBias: 0 };
        let weaponId = tank.selectedWeapon || 'default';

        // Nemesis-only advantage: pre-plan weapon before the global weapon-selection step.
        if (isPureNemesis && weaponId === 'default') {
            const allTanks = Array.isArray(state.tanks) && state.tanks.length > 0
                ? state.tanks
                : [tank, target];
            const preplanned = this.computeBestWeapon(tank, target, allTanks, env);
            this.pendingWeaponId = preplanned;
            this.pendingWeaponTarget = target.name;
            if (preplanned && preplanned !== 'default') {
                weaponId = preplanned;
            }
        }

        const planned = this.planShot(tank, target, env, weaponId, current.angleBias, current.powerBias);
        
        const noiseDeg = (Math.random() * 2 - 1) * (isPureNemesis ? 0.08 : 0.2);
        const noisePower = (Math.random() * 2 - 1) * (isPureNemesis ? 0.12 : 0.25);
        this.lastShotDirection.set(target.name, Math.cos(planned.angle) >= 0 ? 1 : -1);

        return {
            angle: planned.angle + (noiseDeg * Math.PI / 180),
            power: Math.max(10, Math.min(100, planned.power + noisePower))
        };
    }

    onShotResult(target, impactX, impactY) {
        const tx = target.x + target.width / 2;
        const ty = target.y - target.height / 2;
        const errorX = impactX - tx;
        const errorY = impactY - ty;
        const current = this.adjustments.get(target.name) || { angleBias: 0, powerBias: 0 };
        const direction = this.lastShotDirection.get(target.name) || 1;
        const powerGain = this.constructor === NemesisAI ? 0.024 : 0.018;
        const angleGain = this.constructor === NemesisAI ? 0.00032 : 0.00025;
        current.powerBias = Math.max(-12, Math.min(12, current.powerBias - (errorX * direction * powerGain)));
        current.angleBias = Math.max(-0.1, Math.min(0.1, current.angleBias + (errorY * angleGain)));

        if (Math.abs(errorX) < 18) current.powerBias *= 0.85;
        if (Math.abs(errorY) < 20) current.angleBias *= 0.9;

        this.adjustments.set(target.name, current);
    }

    buildBattlefieldContext(allTanks, target = null) {
        const tanks = Array.isArray(allTanks) ? allTanks : [];
        const alive = tanks.filter(t => t && t.alive);
        const enemies = target
            ? alive.filter(t => t !== target)
            : alive;

        const relief = this.estimateTerrainRelief(state.terrain, state.canvas);
        const highEnemyCount = alive.filter(t => (t?.y ?? 600) < 320).length;
        const clusteredNearTarget = target ? this.countEnemiesNear(target, alive, 140) : 0;

        return {
            aliveCount: alive.length,
            enemyCount: enemies.length,
            terrainRelief: relief,
            highEnemyCount,
            clusteredNearTarget
        };
    }

    getQuakePressureScore(context, target = null) {
        const reliefScore = Math.max(0, (context.terrainRelief - 120) * 0.16);
        const crowdScore = Math.max(0, context.aliveCount - 2) * 7;
        const highGroundScore = context.highEnemyCount * 6;
        const clusterScore = context.clusteredNearTarget * 10;
        const targetElevation = target ? Math.max(0, 360 - target.y) * 0.12 : 0;
        return reliefScore + crowdScore + highGroundScore + clusterScore + targetElevation;
    }

    countEnemiesNear(target, allAliveTanks, radius = 140) {
        const tx = target.x + target.width / 2;
        const ty = target.y - target.height / 2;
        let count = 0;
        for (const t of allAliveTanks) {
            if (t === target) continue;
            const ox = t.x + t.width / 2;
            const oy = t.y - t.height / 2;
            const dist = Math.sqrt((tx - ox) ** 2 + (ty - oy) ** 2);
            if (dist <= radius) count++;
        }
        return count;
    }

    estimateTerrainRelief(terrain, canvas) {
        if (!terrain?.isSolid || !canvas?.width || !canvas?.height) return 0;
        const sampleCount = 32;
        const heights = [];
        for (let i = 0; i < sampleCount; i++) {
            const x = Math.floor((i / (sampleCount - 1)) * (canvas.width - 1));
            const y = this.sampleSurfaceY(terrain, x, canvas.height);
            if (y !== null) heights.push(y);
        }
        if (heights.length < 2) return 0;
        const minY = Math.min(...heights);
        const maxY = Math.max(...heights);
        return maxY - minY;
    }

    sampleSurfaceY(terrain, x, canvasHeight) {
        for (let y = 0; y < canvasHeight; y++) {
            if (terrain.isSolid(x, y)) return y;
        }
        return null;
    }
}

export class MastermindAI extends AIController {
    constructor() {
        super();
        this.currentTarget = null;
        this.adjustments = new Map(); // targetName -> { angleBias, powerBias, weight }
        this.lastShot = new Map(); // targetName -> { angle, power, weaponId }
    }

    shop(store, tank, allTanks = null) {
        const affordable = store.items.filter(i => i.price <= tank.currency);
        if (affordable.length === 0) return;

        // Survival First
        if (tank.health <= 60) {
            const health = affordable.find(i => i.id === 'health');
            if (health) { store.buyItem('health'); return; }
        }

        // Tactical Evaluation: Prefer explosives for reliable damage and terrain control.
        const context = this.getTotalWarContext(state.tanks || [tank], state.terrain);
        
        let targetItem = null;
        if (context.terrainRelief > 150 || context.clumpScore > 25) {
            targetItem = affordable.find(i => ['mega_nuke', 'titan_shell', 'earthquake_l'].includes(i.id));
        } else {
            targetItem = affordable.find(i => ['blockbuster', 'heavy', 'laser'].includes(i.id));
        }

        if (targetItem) {
            store.buyItem(targetItem.id);
        } else {
            // Default to building an arsenal
            const fallback = affordable.find(i => i.id === 'cluster_bomb' || i.id === 'earthquake_m');
            if (fallback) store.buyItem(fallback.id);
        }
    }

    chooseTarget(tank, allTanks) {
        const targets = allTanks.filter(t => t !== tank && t.alive);
        if (targets.length === 0) return null;

        // Mastermind Target Selection: Highest Lethality ROI
        let bestTarget = targets[0];
        let maxScore = -Infinity;

        for (const t of targets) {
            const dist = Math.abs(t.x - tank.x);
            const healthFactor = (110 - t.health) / 100;
            const elevationFactor = (600 - t.y) / 600;
            const clumpFactor = detectClumping(t, allTanks) ? 1.5 : 1.0;
            
            // Score targets based on vulnerability and tactical value
            const score = (healthFactor * 50) + (elevationFactor * 30) + (clumpFactor * 20) - (dist * 0.02);
            
            if (score > maxScore) {
                maxScore = score;
                bestTarget = t;
            }
        }

        this.currentTarget = bestTarget;
        return bestTarget;
    }

    chooseWeapon(tank, target, allTanks, env = null) {
        const weapons = (tank.inventory || []).filter(i => i.effect?.type === 'weapon');
        const unique = Array.from(new Map(weapons.map(w => [w.id, w])).values());
        const options = [{ id: 'default', price: 0, effect: { radius: 15, damage: 50 } }, ...unique];
        
        const simEnv = env || { wind: state.wind, gravity: state.gravity, checkTerrain: (x, y) => state.terrain?.checkCollision(x, y) };
        const now = Date.now();
        const weaponDeadline = Number.isFinite(simEnv.aiDeadline) ? simEnv.aiDeadline : (now + 120);
        const evalEnv = Number.isFinite(simEnv.aiDeadline) && simEnv.aiDeadline === weaponDeadline
            ? simEnv
            : { ...simEnv, aiDeadline: weaponDeadline };
        let bestId = 'default';
        let bestScore = -Infinity;

        // Baseline shot to see if we are blocked
        const baseline = this.planShot(tank, target, evalEnv, 'default', 0, 0);
        const baselineError = Number.isFinite(baseline.error) ? baseline.error : 220;
        const isBlocked = baselineError > 35;

        for (const weapon of options) {
            if (Date.now() >= weaponDeadline) break;
            const profile = this.getWeaponProfile(tank, weapon.id);
            const shot = this.planShot(tank, target, evalEnv, weapon.id, 0, 0);
            const radius = profile.radius;
            const damage = profile.damage;
            const isTerrainClearer = weapon.effect?.type === 'terrain_remover' || radius >= 45;
            
            // Total War Simulation: Calculate actual potential damage across all targets
            let potentialDamage = 0;
            let selfHarm = 0;

            for (const other of allTanks) {
                if (!other.alive) continue;
                const dx = (target.x + target.width/2) - (other.x + other.width/2);
                const dy = (target.y - target.height/2) - (other.y - other.height/2);
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < radius) {
                    const factor = 1 - (dist / radius);
                    const d = damage * factor;
                    if (other === tank) selfHarm += d;
                    else potentialDamage += d * (other === target ? 1.2 : 1.0);
                }
            }

            // TACTICAL PATHFINDING: If blocked, weight terrain-clearing much higher
            let tacticalBonus = 0;
            if (isBlocked && isTerrainClearer) {
                tacticalBonus = 40; 
                // If the shot actually hits near the obstruction, give even more bonus
                if (shot.error < baselineError) tacticalBonus += 20;
            }

            if (weapon.id === 'laser') {
                const laser = this.planLaserShot(tank, target, evalEnv);
                if (!laser?.canHit) {
                    tacticalBonus -= 140;
                } else {
                    tacticalBonus -= 28; // conservative default: laser is fallback utility
                    if (this.shouldUseLaserAsFallback(tank, target, evalEnv, baselineError)) {
                        tacticalBonus += 34;
                    } else {
                        tacticalBonus -= 18;
                    }
                }
            }

            // Tactical Score = (Damage Gained) - (Self Harm * 4) + (Pathfinding Bonus)
            const efficiency = 1 - (weapon.price / 1000);
            const score = potentialDamage - (selfHarm * 4) + tacticalBonus + (efficiency * 10);

            if (score > bestScore) {
                bestScore = score;
                bestId = weapon.id;
            }
        }
        return bestId;
    }

    calculateShot(tank, target, env) {
        const adj = this.adjustments.get(target.name) || { angleBias: 0, powerBias: 0, weight: 0 };
        const weaponId = tank.selectedWeapon || 'default';
        const planned = this.planShot(tank, target, env, weaponId, adj.angleBias, adj.powerBias);
        
        // Robotic Precision: 0.02 / 0.05 noise floor
        const noiseDeg = (Math.random() * 2 - 1) * 0.02;
        const noisePower = (Math.random() * 2 - 1) * 0.05;

        this.lastShot.set(target.name, { angle: planned.angle, power: planned.power, weaponId });

        return {
            angle: planned.angle + (noiseDeg * Math.PI / 180),
            power: Math.max(10, Math.min(100, planned.power + noisePower))
        };
    }

    onShotResult(target, impactX, impactY) {
        const tx = target.x + target.width / 2;
        const ty = target.y - target.height / 2;
        const errorX = impactX - tx;
        const errorY = impactY - ty;
        
        const adj = this.adjustments.get(target.name) || { angleBias: 0, powerBias: 0, weight: 0 };
        const last = this.lastShot.get(target.name);
        if (!last) return;

        // EWMA (Exponentially Weighted Moving Average) Learning
        // Converges faster and stabilizes better than simple proportional gain.
        const alpha = 0.45; // Learning rate (High = Fast adaptation)
        const direction = Math.cos(last.angle) >= 0 ? 1 : -1;

        // Power Adjustment
        const pCorrection = -(errorX * direction * 0.025);
        adj.powerBias = (adj.powerBias * (1 - alpha)) + (pCorrection * alpha);

        // Angle Adjustment
        const aCorrection = (errorY * 0.0004);
        adj.angleBias = (adj.angleBias * (1 - alpha)) + (aCorrection * alpha);

        // Bias Decay: Gradually reduce biases to allow perfect simulation to take over
        adj.powerBias *= 0.6;
        adj.angleBias *= 0.6;

        this.adjustments.set(target.name, adj);
    }

    getTotalWarContext(allTanks, terrain) {
        let relief = 0;
        if (terrain && terrain.isSolid) {
            const h1 = this.sampleSurfaceY(terrain, 100, 600) || 500;
            const h2 = this.sampleSurfaceY(terrain, 600, 600) || 500;
            const h3 = this.sampleSurfaceY(terrain, 1100, 600) || 500;
            relief = Math.max(h1, h2, h3) - Math.min(h1, h2, h3);
        }

        const clumpScore = allTanks.filter(t => t.alive && detectClumping(t, allTanks)).length * 10;
        return { terrainRelief: relief, clumpScore };
    }

    sampleSurfaceY(terrain, x, canvasHeight) {
        for (let y = 0; y < canvasHeight; y++) {
            if (terrain.isSolid(x, y)) return y;
        }
        return null;
    }
}

/**
 * BITWISE COMMANDER (80's Edition)
 * A tribute to 'Tank Wars' (bomb.exe).
 * Uses Binary Search Convergence instead of brute-force simulation.
 * Employs Analytical Wind-Ghosting for instant target acquisition.
 */
export class BitwiseCommanderAI extends AIController {
    constructor() {
        super();
        this.currentTarget = null;
        this.windCorrections = new Map(); // targetName -> horizontal correction
        this.powerCorrections = new Map(); // targetName -> power correction
        this.lastShotDirection = new Map(); // targetName -> 1 | -1
        this.lastShotPlan = new Map(); // targetName -> { angle, power, direction, rangeX, rangeY, isShortLob }
        this.shortLobMemory = new Map(); // targetName -> { lastSign, lastSignedMiss, repeatCount, lastPower }
        this.pendingWeaponId = null;
        this.pendingTargetName = null;
        this.siegeCache = new Map(); // targetName -> recent siege metadata
        this.precisionFloor = 0.0012; // low jitter: deterministic retro feel
    }

    shop(store, tank, allTanks = null) {
        const affordable = store.items.filter(i => i.price <= tank.currency);
        if (affordable.length === 0) return;

        if (tank.health <= 45) {
            const health = affordable.find(i => i.id === 'health');
            if (health) {
                store.buyItem('health');
                return;
            }
        }

        const context = this.getRetroContext(state.tanks || [tank], null);
        if (context.terrainRelief > 130) {
            const terrainClearers = ['shovel', 'earthquake_m', 'earthquake_l', 'blockbuster', 'laser'];
            const breaker = terrainClearers.map(id => affordable.find(i => i.id === id)).find(Boolean);
            if (breaker) {
                store.buyItem(breaker.id);
                return;
            }
        }
        if (context.quakeMode) {
            if (affordable.find(i => i.id === 'earthquake_l')) { store.buyItem('earthquake_l'); return; }
            if (affordable.find(i => i.id === 'earthquake_m')) { store.buyItem('earthquake_m'); return; }
        }

        // Retro value-per-credit heuristic.
        let best = null;
        let bestScore = -Infinity;
        for (const item of affordable) {
            const damage = item.effect?.damage || 0;
            const radius = item.effect?.radius || 15;
            const value = (damage + (radius * 0.6)) / Math.max(1, item.price);
            if (value > bestScore) {
                bestScore = value;
                best = item;
            }
        }
        if (best) store.buyItem(best.id);
    }

    chooseTarget(tank, allTanks) {
        const targets = allTanks.filter(t => t !== tank && t.alive);
        if (targets.length === 0) return null;

        let best = targets[0];
        let bestScore = -Infinity;
        for (const t of targets) {
            const distance = Math.max(1, Math.abs((t.x + t.width / 2) - (tank.x + tank.width / 2)));
            const killPressure = (110 - t.health) * 1.6;
            const clusterBonus = detectClumping(t, allTanks) ? 22 : 0;
            const elevationBonus = Math.max(0, 380 - t.y) * 0.12;
            const distanceBonus = 300 / (distance + 70);
            const score = killPressure + clusterBonus + elevationBonus + distanceBonus;
            if (score > bestScore) {
                bestScore = score;
                best = t;
            }
        }

        this.currentTarget = best;
        return best;
    }

    chooseWeapon(tank, target, allTanks, env = null) {
        if (this.pendingWeaponId && this.pendingTargetName === target?.name) {
            const pending = this.pendingWeaponId;
            this.pendingWeaponId = null;
            this.pendingTargetName = null;
            if (pending === 'default' || (tank.inventory || []).some(i => i.id === pending)) {
                return pending;
            }
        }
        return this.computeBestWeapon(tank, target, allTanks, env);
    }

    computeBestWeapon(tank, target, allTanks, env = null) {
        const simEnv = env || {
            wind: state.wind,
            gravity: state.gravity,
            checkTerrain: (x, y) => state.terrain?.checkCollision ? state.terrain.checkCollision(x, y) : false
        };
        const now = Date.now();
        const deadline = Number.isFinite(simEnv.aiDeadline) ? simEnv.aiDeadline : (now + 80);
        const evalEnv = Number.isFinite(simEnv.aiDeadline) && simEnv.aiDeadline === deadline
            ? simEnv
            : { ...simEnv, aiDeadline: deadline };

        const weapons = (tank.inventory || []).filter(i => i.effect?.type === 'weapon');
        const unique = Array.from(new Map(weapons.map(w => [w.id, w])).values());
        const options = [{ id: 'default', price: 0, effect: { radius: 15, damage: 50 } }, ...unique];

        const baseline = this.solveRetroShot(tank, target, evalEnv, 'default', true);
        const baselineError = Number.isFinite(baseline?.error) ? baseline.error : 240;
        const entrenchment = this.assessEntrenchment(target, evalEnv);
        const siegeNeeded = this.shouldEnterSiege(target, evalEnv, baselineError, this.getShotHistory(target), entrenchment);
        if (siegeNeeded) {
            const siegeWeapon = this.pickTerrainBreakerWeapon(tank, options, target, evalEnv);
            if (siegeWeapon) return siegeWeapon;
        }

        const context = this.getRetroContext(allTanks, target);
        if (context.quakeMode) {
            if (options.find(o => o.id === 'earthquake_l')) return 'earthquake_l';
            if (options.find(o => o.id === 'earthquake_m')) return 'earthquake_m';
        }

        let bestId = 'default';
        let bestScore = -Infinity;
        const tankX = tank.x + tank.width / 2;
        const tankY = tank.y - tank.height / 2;
        const targetX = target.x + target.width / 2;
        const targetY = target.y - target.height / 2;

        for (const weapon of options) {
            if (Date.now() >= deadline) break;

            const profile = this.getWeaponProfile(tank, weapon.id);
            const radius = profile.radius;
            const damage = profile.damage;
            const price = weapon.price || 0;
            const shot = this.solveRetroShot(tank, target, evalEnv, weapon.id, true);
            const error = Number.isFinite(shot?.error) ? shot.error : 220;

            const hitScore = Math.max(0, 95 - error) * 1.15;
            let splashScore = 0;
            for (const other of allTanks) {
                if (!other.alive || other === tank) continue;
                const ox = other.x + other.width / 2;
                const oy = other.y - other.height / 2;
                const dist = Math.sqrt((targetX - ox) ** 2 + (targetY - oy) ** 2);
                if (dist < radius) {
                    const factor = 1 - (dist / radius);
                    splashScore += damage * factor * (other === target ? 1.0 : 0.65);
                }
            }

            const selfDist = Math.sqrt((targetX - tankX) ** 2 + (targetY - tankY) ** 2);
            const selfRisk = selfDist < radius ? (radius - selfDist) * 2.6 : 0;
            const economyPenalty = price * 0.035;
            const quakeBonus = (weapon.id === 'earthquake_l' || weapon.id === 'earthquake_m')
                ? (context.quakePressure * 1.25)
                : 0;
            const terrainBonus = (siegeNeeded && this.isTerrainBreakerId(weapon.id)) ? 34 : 0;
            let laserPenalty = 0;
            if (weapon.id === 'laser') {
                const laser = this.planLaserShot(tank, target, evalEnv);
                if (!laser?.canHit) {
                    laserPenalty = 140;
                } else if (!this.shouldUseLaserAsFallback(tank, target, evalEnv, baselineError)) {
                    laserPenalty = 48;
                } else {
                    laserPenalty = 8;
                }
            }

            const score = hitScore + splashScore + quakeBonus + terrainBonus - selfRisk - economyPenalty - laserPenalty;
            if (score > bestScore) {
                bestScore = score;
                bestId = weapon.id;
            }
        }

        return bestId;
    }

    calculateShot(tank, target, env) {
        const simEnv = env || {
            wind: state.wind,
            gravity: state.gravity,
            checkTerrain: (x, y) => state.terrain?.checkCollision ? state.terrain.checkCollision(x, y) : false
        };

        const allTanks = Array.isArray(state.tanks) && state.tanks.length > 0 ? state.tanks : [tank, target];
        let weaponId = tank.selectedWeapon || 'default';
        const hasSpecialWeapon = (tank.inventory || []).some(i => i.effect?.type === 'weapon');
        if (weaponId === 'default' && hasSpecialWeapon) {
            const preplanned = this.computeBestWeapon(tank, target, allTanks, simEnv);
            this.pendingWeaponId = preplanned;
            this.pendingTargetName = target.name;
            if (preplanned && preplanned !== 'default') weaponId = preplanned;
        }

        const retro = this.solveRetroShot(tank, target, simEnv, weaponId, false);
        const fallback = this.planShot(tank, target, simEnv, weaponId, 0, 0);
        const fallbackWrapped = { angle: fallback.angle, power: fallback.power, error: Number.isFinite(fallback.error) ? fallback.error : 999 };

        let planned = fallbackWrapped;
        if (retro && Number.isFinite(retro.error)) {
            const fallbackError = fallbackWrapped.error;
            // Prefer retro when close or better; prefer planShot for tricky pits/valleys.
            planned = (retro.error <= (fallbackError + 8)) ? retro : fallbackWrapped;
        }

        const entrenchment = this.assessEntrenchment(target, simEnv);
        const shotHistory = this.getShotHistory(target);
        const plannedError = Number.isFinite(planned?.error) ? planned.error : 999;
        const siegeNeeded = this.shouldEnterSiege(target, simEnv, plannedError, shotHistory, entrenchment);
        if (siegeNeeded) {
            const siegeWeapon = this.isTerrainBreakerId(weaponId)
                ? weaponId
                : this.pickTerrainBreakerWeapon(tank, null, target, simEnv);
            if (siegeWeapon) {
                const siegeShot = this.planSiegeShot(tank, target, simEnv, siegeWeapon, entrenchment);
                if (siegeShot) {
                    weaponId = siegeWeapon;
                    this.pendingWeaponId = siegeWeapon;
                    this.pendingTargetName = target.name;
                    planned = siegeShot;
                    this.siegeCache.set(target.name, {
                        weaponId: siegeWeapon,
                        coverDepth: entrenchment.coverDepth,
                        beyondCanvas: entrenchment.beyondCanvas
                    });
                }
            }
        } else {
            this.siegeCache.delete(target.name);
        }

        const powerCorrection = this.powerCorrections.get(target.name) || 0;
        const angleNoise = weaponId === 'laser' ? (this.precisionFloor * 0.25) : this.precisionFloor;
        const powerNoise = weaponId === 'laser' ? 0.01 : 0.03;
        const tankX = tank.x + tank.width / 2;
        const tankY = tank.y - tank.height;
        const targetX = target.x + target.width / 2;
        const targetY = target.y - target.height / 2;
        const rangeX = Math.abs(targetX - tankX);
        const rangeY = targetY - tankY;
        const isShortLob = rangeX <= 320 && Math.abs(rangeY) <= 170;
        const shortLob = this.shortLobMemory.get(target.name);
        let antiRepeatPowerBias = 0;
        if (isShortLob && shortLob && shortLob.repeatCount >= 1 && Number.isFinite(shortLob.lastSignedMiss)) {
            // 80s-style ladder step: deterministic jump to escape repeated miss loops.
            const step = Math.max(0.8, Math.min(5.5, (Math.abs(shortLob.lastSignedMiss) * 0.035) + (shortLob.repeatCount * 0.8)));
            antiRepeatPowerBias = shortLob.lastSignedMiss < 0 ? step : -step;
        }

        const angle = planned.angle + ((Math.random() * 2 - 1) * angleNoise);
        const power = Math.max(10, Math.min(100, planned.power + powerCorrection + antiRepeatPowerBias + ((Math.random() * 2 - 1) * powerNoise)));
        const direction = Math.cos(angle) >= 0 ? 1 : -1;
        this.lastShotDirection.set(target.name, direction);
        this.lastShotPlan.set(target.name, { angle, power, direction, rangeX, rangeY, isShortLob });

        return {
            angle,
            power
        };
    }

    isTerrainBreakerId(weaponId) {
        if (!weaponId) return false;
        return ['default', 'laser', 'shovel', 'earthquake_s', 'earthquake_m', 'earthquake_l', 'blockbuster', 'titan_shell', 'mega_nuke', 'heavy'].includes(weaponId);
    }

    pickTerrainBreakerWeapon(tank, options = null, target = null, env = null) {
        const available = new Set(
            Array.isArray(options)
                ? options.map(o => o.id)
                : ['default', ...((tank.inventory || []).map(i => i.id))]
        );

        const order = ['shovel', 'earthquake_l', 'earthquake_m', 'earthquake_s', 'blockbuster', 'titan_shell', 'mega_nuke', 'heavy'];
        if (!target || !env) {
            for (const id of order) {
                if (available.has(id)) return id;
            }
            if (available.has('laser')) return 'laser';
            if (available.has('default')) return 'default';
            return null;
        }

        let bestNonLaserId = null;
        let bestNonLaserError = Infinity;
        for (const id of order) {
            if (!available.has(id)) continue;
            const shot = this.planShot(tank, target, env, id, 0, 0);
            const err = Number.isFinite(shot?.error) ? shot.error : 220;
            if (err < bestNonLaserError) {
                bestNonLaserError = err;
                bestNonLaserId = id;
            }
            if (err <= 55) return id;
        }

        if (available.has('laser')) {
            if (this.shouldUseLaserAsFallback(tank, target, env, bestNonLaserError)) {
                return 'laser';
            }
        }

        if (bestNonLaserId) return bestNonLaserId;
        if (available.has('default')) return 'default';
        if (available.has('laser')) return 'laser';
        return null;
    }

    sampleTerrainSurfaceY(env, x, maxY = 900) {
        if (!env?.checkTerrain || !Number.isFinite(x)) return null;
        const canvasWidth = state.canvas?.width || 1200;
        const clampedX = Math.max(0, Math.min(canvasWidth - 1, Math.round(x)));
        const probeMax = Math.max(0, Math.min(2200, Math.round(maxY)));
        for (let y = 0; y <= probeMax; y++) {
            if (env.checkTerrain(clampedX, y)) return y;
        }
        return null;
    }

    assessEntrenchment(target, env) {
        const tx = target.x + target.width / 2;
        const ty = target.y - target.height / 2;
        const canvasHeight = state.canvas?.height || 600;
        const probeMax = Math.max(canvasHeight + 240, target.y + 80);
        const samples = [
            this.sampleTerrainSurfaceY(env, tx - 8, probeMax),
            this.sampleTerrainSurfaceY(env, tx, probeMax),
            this.sampleTerrainSurfaceY(env, tx + 8, probeMax)
        ].filter(Number.isFinite);

        const surfaceY = samples.length > 0 ? Math.min(...samples) : null;
        const coverDepth = Number.isFinite(surfaceY) ? (ty - surfaceY) : 0;
        const beyondCanvas = ty - canvasHeight;

        return {
            tx,
            ty,
            canvasHeight,
            surfaceY,
            coverDepth,
            beyondCanvas
        };
    }

    shouldEnterSiege(target, env, plannedError, shotHistory, entrenchment = null) {
        const geometry = entrenchment || this.assessEntrenchment(target, env);
        if (geometry.beyondCanvas > 24) return true;
        if (geometry.coverDepth > 90) return true;
        if (plannedError > 90) return true;
        if (shotHistory >= 2 && plannedError > 55) return true;
        return false;
    }

    clampAngle(angle) {
        return Math.max(2 * Math.PI / 180, Math.min(178 * Math.PI / 180, angle));
    }

    computeAimAngle(tank, aimX, aimY) {
        const originX = tank.x + tank.width / 2;
        const originY = tank.y - tank.height;
        const dx = aimX - originX;
        const dy = aimY - originY;
        const angle = Math.atan2(-dy, dx);
        return this.clampAngle(angle);
    }

    createAimProxyTarget(target, aimX, aimY) {
        return {
            ...target,
            x: aimX - target.width / 2,
            y: aimY + target.height / 2,
            width: target.width,
            height: target.height,
            name: `${target.name}-breach`
        };
    }

    planSiegeShot(tank, target, env, weaponId, entrenchment = null) {
        const info = entrenchment || this.assessEntrenchment(target, env);
        const tx = target.x + target.width / 2;
        const ty = target.y - target.height / 2;
        const canvasHeight = info.canvasHeight || (state.canvas?.height || 600);
        const surfaceY = Number.isFinite(info.surfaceY) ? info.surfaceY : null;

        if (weaponId === 'laser') {
            const breachY = Number.isFinite(surfaceY)
                ? Math.min(canvasHeight - 6, Math.max(16, surfaceY + 8))
                : Math.min(canvasHeight - 8, Math.max(16, ty));
            return {
                angle: this.computeAimAngle(tank, tx, breachY),
                power: 72,
                error: Math.abs(ty - breachY) * 0.35
            };
        }

        const localDepth = Math.max(10, Math.min(32, (info.coverDepth || 0) * 0.12));
        const breachY = Number.isFinite(surfaceY)
            ? Math.max(14, Math.min(canvasHeight - 6, surfaceY + localDepth))
            : Math.max(14, Math.min(canvasHeight - 6, ty));
        const breachTarget = this.createAimProxyTarget(target, tx, breachY);
        const planned = this.planShot(tank, breachTarget, env, weaponId, 0, 0);

        if (Number.isFinite(planned?.angle) && Number.isFinite(planned?.power)) {
            const syntheticError = Number.isFinite(planned.error)
                ? planned.error + Math.max(0, (ty - breachY) * 0.18)
                : Math.max(20, Math.abs(ty - breachY) * 0.2);
            return { angle: planned.angle, power: planned.power, error: syntheticError };
        }

        return {
            angle: this.computeAimAngle(tank, tx, breachY),
            power: 68,
            error: Math.abs(ty - breachY) * 0.4
        };
    }

    onShotResult(target, impactX, impactY) {
        const tx = target.x + target.width / 2;
        const errorX = impactX - tx;
        const ty = target.y - target.height / 2;
        const errorY = impactY - ty;

        const lastPlan = this.lastShotPlan.get(target.name);
        const currentWind = this.windCorrections.get(target.name) || 0;
        const currentPower = this.powerCorrections.get(target.name) || 0;
        const direction = lastPlan?.direction || this.lastShotDirection.get(target.name) || (errorX > 0 ? 1 : -1);
        const signedRangeError = errorX * direction;

        if (Math.abs(errorX) < 260) {
            const updatedWind = Math.max(-280, Math.min(280, currentWind + (errorX * 0.42)));
            this.windCorrections.set(target.name, updatedWind);
        }
        let updatedPower = currentPower;
        if (Math.abs(errorX) < 220) {
            // 80s Style: Proportional gain with a minimum step
            let gain = 0.025;
            
            // If error is significant (>10px), ensure at least a minor correction
            let correction = errorX * gain * direction;
            if (Math.abs(errorX) > 10 && Math.abs(correction) < 0.5) {
                correction = 0.5 * (errorX * direction > 0 ? 1 : -1);
            }

            // Jumpstart: If we are very far off (>100px), apply a flat extra correction
            if (Math.abs(errorX) > 100) {
                correction += 1.5 * (errorX * direction > 0 ? 1 : -1);
            }

            updatedPower -= correction;
        }

        if (lastPlan?.isShortLob && Math.abs(signedRangeError) > 8) {
            const previous = this.shortLobMemory.get(target.name) || { lastSign: 0, lastSignedMiss: 0, repeatCount: 0, lastPower: lastPlan.power };
            const sign = Math.sign(signedRangeError);
            const closeMiss = Math.abs(Math.abs(signedRangeError) - Math.abs(previous.lastSignedMiss || 0)) <= 22;
            const nearSamePower = Number.isFinite(previous.lastPower) ? Math.abs(lastPlan.power - previous.lastPower) < 1.8 : true;
            const repeated = sign !== 0 && previous.lastSign === sign && closeMiss && nearSamePower;
            const repeatCount = repeated ? Math.min(5, (previous.repeatCount || 0) + 1) : 0;

            if (sign !== 0) {
                const bracketStep = Math.max(1.1, Math.min(6.5, (Math.abs(signedRangeError) * 0.04) + (repeatCount * 0.9)));
                if (sign < 0) {
                    // Undershoot: force a stronger power-up step.
                    updatedPower += bracketStep;
                } else {
                    // Overshoot: force a stronger power-down step.
                    updatedPower -= bracketStep;
                }
            }

            this.shortLobMemory.set(target.name, {
                lastSign: sign,
                lastSignedMiss: signedRangeError,
                repeatCount,
                lastPower: lastPlan.power
            });
        } else {
            const previous = this.shortLobMemory.get(target.name);
            if (previous) {
                this.shortLobMemory.set(target.name, {
                    ...previous,
                    repeatCount: Math.max(0, (previous.repeatCount || 0) - 1),
                    lastSignedMiss: signedRangeError,
                    lastPower: lastPlan?.power ?? previous.lastPower
                });
            }
        }

        this.powerCorrections.set(target.name, Math.max(-20, Math.min(20, updatedPower)));
        if (Math.abs(errorY) < 20) {
            this.powerCorrections.set(target.name, (this.powerCorrections.get(target.name) || 0) * 0.92);
        }
    }

    getRetroContext(allTanks, target = null) {
        const alive = (allTanks || []).filter(t => t && t.alive);
        const relief = this.estimateRelief(state.terrain, state.canvas);
        const highCount = alive.filter(t => (t.y ?? 600) < 320).length;
        const nearby = target ? this.countNearbyEnemies(target, alive, 140) : 0;
        const quakePressure = Math.max(0, (relief - 110) * 0.14) + (Math.max(0, alive.length - 2) * 5) + (highCount * 4) + (nearby * 9);
        return {
            aliveCount: alive.length,
            terrainRelief: relief,
            highCount,
            nearby,
            quakePressure,
            quakeMode: quakePressure >= 62 && alive.length >= 4
        };
    }

    estimateRelief(terrain, canvas) {
        if (!terrain?.isSolid || !canvas?.width || !canvas?.height) return 0;
        const samples = 20;
        const ys = [];
        for (let i = 0; i < samples; i++) {
            const x = Math.floor((i / (samples - 1)) * (canvas.width - 1));
            for (let y = 0; y < canvas.height; y++) {
                if (terrain.isSolid(x, y)) {
                    ys.push(y);
                    break;
                }
            }
        }
        if (ys.length < 2) return 0;
        return Math.max(...ys) - Math.min(...ys);
    }

    countNearbyEnemies(target, allAlive, radius = 140) {
        const tx = target.x + target.width / 2;
        const ty = target.y - target.height / 2;
        let count = 0;
        for (const t of allAlive) {
            if (t === target) continue;
            const ox = t.x + t.width / 2;
            const oy = t.y - t.height / 2;
            const dist = Math.sqrt((tx - ox) ** 2 + (ty - oy) ** 2);
            if (dist <= radius) count++;
        }
        return count;
    }

    getDirectionProfiles(tank, target, edgeMode, canvasWidth) {
        const dx = (target.x + target.width / 2) - (tank.x + tank.width / 2);
        const nativeRight = dx >= 0;
        const profiles = [{ rightSide: nativeRight, powerBias: 0 }];

        if (edgeMode === 'teleport' && canvasWidth > 0) {
            const wrappedDx = dx - Math.round(dx / canvasWidth) * canvasWidth;
            const wrapRight = wrappedDx >= 0;
            if (wrapRight !== nativeRight) {
                profiles.unshift({ rightSide: wrapRight, powerBias: 0 });
            }
        } else if (edgeMode === 'reflect') {
            // Always include both directions in reflect mode
            if (!profiles.find(p => p.rightSide === !nativeRight)) {
                profiles.push({ rightSide: !nativeRight, powerBias: 0 });
            }
        }

        return profiles;
    }

    getRetroAngles(edgeMode, quick = false) {
        if (edgeMode === 'reflect') {
            return (quick ? [70, 76, 82] : [68, 72, 76, 80, 84]).map(d => d * Math.PI / 180);
        }
        if (quick) {
            return [32, 42, 55, 70].map(d => d * Math.PI / 180);
        }
        return [28, 35, 42, 50, 58, 66, 74, 82].map(d => d * Math.PI / 180);
    }

    solveRetroShot(tank, target, env, weaponId = 'default', quick = false) {
        const weapon = this.getWeaponProfile(tank, weaponId);
        const edgeMode = state.activeEdgeBehavior || 'impact';
        const canvasWidth = state.canvas?.width || 1200;
        const deadline = Number.isFinite(env?.aiDeadline) ? env.aiDeadline : (Date.now() + (quick ? 45 : 85));
        const angles = this.getRetroAngles(edgeMode, quick);
        const profiles = this.getDirectionProfiles(tank, target, edgeMode, canvasWidth);

        const targetX = target.x + target.width / 2;
        const targetY = target.y - target.height / 2;
        const windCorrection = this.windCorrections.get(target.name) || 0;
        const ghostTargetX = targetX - (env.wind * 1150) - windCorrection;
        const iterations = quick ? 6 : 10;
        const minPower = weapon.speedMultiplier > 1 ? 10 : 15;
        const maxPower = weapon.speedMultiplier > 1 ? 90 : 100;

        let best = null;
        let minError = Infinity;

        profileLoop: for (const profile of profiles) {
            for (const baseAngle of angles) {
                if (Date.now() >= deadline) break profileLoop;
                const angle = profile.rightSide ? baseAngle : (Math.PI - baseAngle);
                let low = minPower;
                let high = maxPower;

                for (let i = 0; i < iterations; i++) {
                    if (Date.now() >= deadline) break profileLoop;
                    const power = (low + high) / 2 + profile.powerBias;
                    const trace = this.simulateRetroTrace(tank, target, env, angle, power, weapon.radius, quick);
                    if (trace.error < minError) {
                        minError = trace.error;
                        best = { angle, power, error: trace.error };
                    }

                    const signedX = trace.closestX - ghostTargetX;
                    if (profile.rightSide) {
                        if (signedX < 0) low = power;
                        else high = power;
                    } else {
                        if (signedX > 0) low = power;
                        else high = power;
                    }
                }
            }
        }

        return best;
    }

    simulateRetroTrace(tank, target, env, angle, power, weaponRadius = 15, quick = false) {
        const physicsScale = 0.2;
        const barrelLength = 30;
        let x = tank.x + tank.width / 2 + barrelLength * Math.cos(angle);
        let y = tank.y - tank.height - barrelLength * Math.sin(angle);

        const safeStartingDistance = weaponRadius + 20;
        const tankCenterX = tank.x + tank.width / 2;
        const tankCenterY = tank.y - tank.height / 2;
        const startDist = Math.sqrt((x - tankCenterX) ** 2 + (y - tankCenterY) ** 2);
        if (startDist > 0 && startDist < safeStartingDistance) {
            const k = safeStartingDistance / startDist;
            x = tankCenterX + (x - tankCenterX) * k;
            y = tankCenterY + (y - tankCenterY) * k;
        }

        let vx = power * Math.cos(angle) * physicsScale;
        let vy = -power * Math.sin(angle) * physicsScale;

        const targetX = target.x + target.width / 2;
        const targetY = target.y - target.height / 2;
        let minDist = Infinity;
        let closestX = x;
        const maxTicks = quick ? 520 : 820;

        for (let t = 0; t < maxTicks; t++) {
            vy += env.gravity;
            vx += env.wind;

            const speed = Math.sqrt(vx * vx + vy * vy);
            const rawSteps = Math.ceil(speed / 2);
            const steps = Math.max(1, Math.min(quick ? 45 : 70, rawSteps));
            const stepX = vx / steps;
            const stepY = vy / steps;

            for (let s = 0; s < steps; s++) {
                x += stepX;
                y += stepY;

                if (state.activeEdgeBehavior === 'reflect') {
                    if (x <= 0) { vx = Math.abs(vx); x = 0; }
                    if (x >= (state.canvas?.width || 1200)) { vx = -Math.abs(vx); x = (state.canvas?.width || 1200); }
                    if (y <= 0) { vy = Math.abs(vy); y = 0; }
                } else if (state.activeEdgeBehavior === 'teleport') {
                    if (x < 0) x = (state.canvas?.width || 1200);
                    else if (x > (state.canvas?.width || 1200)) x = 0;
                }

                const d = Math.sqrt((x - targetX) ** 2 + (y - targetY) ** 2);
                if (d < minDist) {
                    minDist = d;
                    closestX = x;
                }

                if (env.checkTerrain && env.checkTerrain(x, y)) {
                    return { error: minDist, closestX };
                }
            }

            if (y > 2000 || x < -700 || x > 3200) break;
        }

        return { error: minDist, closestX };
    }
}

/**
 * THE GHOST
 * Uses the 'Ghost Target' theory:
 * 1. Aims at Target + Shared Offset.
 * 2. Shared Offset is the cumulative error (ActualTarget - Impact) across ALL targets.
 * 3. Knowledge is preserved even after target dies, providing a 'derived' shot for the next target.
 */
export class GhostAI extends AIController {
    constructor() {
        super();
        this.currentTarget = null;
        this.sharedOffset = { x: 0, y: 0 }; // Global physics compensation (shared knowledge)
        this.lastImpactToSelf = Infinity; // Track proximity to self for tactical decisions
        this.sideHitStreaks = new Map(); // targetName -> consecutive side-wall misses
        this.powerScaleByTarget = new Map(); // targetName -> multiplicative power damping
        this.lastShotMeta = new Map(); // targetName -> last shot details
    }

    shop(store, tank, allTanks = null) {
        let loopSafety = 0;
        const currentTanks = allTanks || state.tanks || [];

        while (tank.currency > 0 && loopSafety < 20) {
            loopSafety++;
            const affordable = store.items.filter(i => i.price <= tank.currency);
            if (affordable.length === 0) break;

            const heavyCount = tank.inventory.filter(i => i.id === 'heavy').length;
            const shovelCount = tank.inventory.filter(i => i.id === 'shovel').length;
            const nukeCount = tank.inventory.filter(i => i.id === 'mega_nuke').length;
            const quakeLCount = tank.inventory.filter(i => i.id === 'earthquake_l').length;
            const quakeMCount = tank.inventory.filter(i => i.id === 'earthquake_m').length;
            const aliveTanks = currentTanks.filter(t => t.alive);

            let boughtSomething = false;

            // 1. Shield < 50%
            if (tank.shieldDurability < tank.maxHealth * 0.5) {
                const item = affordable.find(i => i.id === 'shield');
                if (item) { store.buyItem('shield'); boughtSomething = true; }
            }

            // 2. Parachute < 50%
            if (!boughtSomething && tank.parachuteDurability < tank.maxHealth * 0.5) {
                const item = affordable.find(i => i.id === 'parachute');
                if (item) { store.buyItem('parachute'); boughtSomething = true; }
            }

            // 3. Heavy shot < 10
            if (!boughtSomething && heavyCount < 10) {
                const item = affordable.find(i => i.id === 'heavy');
                if (item) { store.buyItem('heavy'); boughtSomething = true; }
            }

            // 4. Shovel < 5
            if (!boughtSomething && shovelCount < 5) {
                const item = affordable.find(i => i.id === 'shovel');
                if (item) { store.buyItem('shovel'); boughtSomething = true; }
            }

            // High priority items for larger games (> 3 players)
            if (!boughtSomething && aliveTanks.length > 3) {
                // 5. Mega Nuke (max 2)
                if (nukeCount < 2) {
                    const nuke = affordable.find(i => i.id === 'mega_nuke');
                    if (nuke) { store.buyItem('mega_nuke'); boughtSomething = true; }
                }
                
                // 6. Mega Quake (max 2)
                if (!boughtSomething && quakeLCount < 2) {
                    const quakeL = affordable.find(i => i.id === 'earthquake_l');
                    if (quakeL) { store.buyItem('earthquake_l'); boughtSomething = true; }
                }
                
                // 7. M Quake (max 3)
                if (!boughtSomething && quakeMCount < 3) {
                    const quakeM = affordable.find(i => i.id === 'earthquake_m');
                    if (quakeM) { store.buyItem('earthquake_m'); boughtSomething = true; }
                }
            }

            if (!boughtSomething) break; // No more priorities met
        }
    }

    chooseWeapon(tank, target, allTanks, env) {
        const history = this.getShotHistory(target);
        const aliveCount = allTanks.filter(t => t.alive).length;
        const dist = Math.abs(target.x - tank.x);
        const hasItem = (id) => tank.inventory.some(i => i.id === id);

        // 1. Shovel Logic: Only use if actually buried
        if (tank.isBuried) {
            // If it's the first shot, or if the previous shot hit near us (dangerous)
            if (history === 0 || this.lastImpactToSelf < 80) {
                if (hasItem('shovel')) return 'shovel';
            }
        }

        // 3. If Target Far and > 3 player and y is high, use a quake
        if (dist > 400 && aliveCount > 3 && target.y < 300) {
            if (hasItem('earthquake_l')) return 'earthquake_l';
            if (hasItem('earthquake_m')) return 'earthquake_m';
        }

        // 4. If Target Far and > 3 players use Nuke else regular
        if (dist > 400 && aliveCount > 3) {
            if (hasItem('mega_nuke')) return 'mega_nuke';
        }

        // Default: Use Heavy if we have lots, else default
        if (hasItem('heavy')) return 'heavy';
        
        return 'default';
    }

    chooseTarget(tank, allTanks) {
        const targets = allTanks.filter(t => t !== tank && t.alive);
        if (targets.length === 0) return null;
        
        // THE GHOST IS PERSISTENT: Stick to the same target until they die
        if (this.currentTarget && this.currentTarget.alive) {
            return this.currentTarget;
        }

        const aliveCount = targets.length + 1; // including self
        const hasHeavyMunitions = tank.inventory.some(i => ['mega_nuke', 'earthquake_l', 'earthquake_m', 'titan_shell'].includes(i.id));

        // TARGET SELECTION:
        // If we have heavy stuff and many players, prioritize the FURTHEST target.
        // Otherwise, pick the closest for standard accuracy building.
        if (aliveCount > 3 && hasHeavyMunitions) {
            this.currentTarget = targets.sort((a, b) => 
                Math.abs(b.x - tank.x) - Math.abs(a.x - tank.x)
            )[0];
        } else {
            this.currentTarget = targets.sort((a, b) => 
                Math.abs(a.x - tank.x) - Math.abs(b.x - tank.x)
            )[0];
        }
        
        return this.currentTarget;
    }

    onShotResult(target, impactX, impactY) {
        // Track proximity to self for tactical decisions (shovel logic)
        const myTank = state.tanks.find(t => t.aiController === this);
        if (myTank) {
            const dx = impactX - (myTank.x + myTank.width / 2);
            const dy = impactY - (myTank.y - myTank.height / 2);
            this.lastImpactToSelf = Math.sqrt(dx*dx + dy*dy);
        }

        const tx = target.x + target.width / 2;
        const ty = target.y - target.height / 2;
        
        // GLOBAL LEARNING: Apply error correction (ActualTarget - Impact) to shared knowledge
        const errorX = tx - impactX;
        const errorY = ty - impactY;
        const canvasWidth = state.canvas?.width || 1200;
        const sideHit = impactX <= 2 || impactX >= (canvasWidth - 2);
        const edgeMode = state.activeEdgeBehavior || 'impact';
        const targetName = target?.name || 'unknown';
        const sideHitInImpactMode = sideHit && edgeMode === 'impact';

        if (sideHitInImpactMode) {
            const streak = Math.min(4, (this.sideHitStreaks.get(targetName) || 0) + 1);
            this.sideHitStreaks.set(targetName, streak);

            // Side-wall misses produce huge X error; damp learning to avoid orbiting feedback loops.
            this.sharedOffset.x += errorX * 0.2;
            this.sharedOffset.y += errorY * 0.35;

            // Power-cut response:
            // first side hit: strong trim; repeated side hits: hard half-power clamp.
            const currentScale = this.powerScaleByTarget.get(targetName) || 1;
            const cutFactor = streak >= 2 ? 0.5 : 0.62;
            this.powerScaleByTarget.set(targetName, Math.max(0.2, currentScale * cutFactor));
        } else {
            this.sideHitStreaks.set(targetName, 0);
            this.sharedOffset.x += errorX;
            this.sharedOffset.y += errorY;

            // Recover power scale slowly after non-side impacts.
            const currentScale = this.powerScaleByTarget.get(targetName) || 1;
            const recovered = currentScale + ((1 - currentScale) * 0.2);
            this.powerScaleByTarget.set(targetName, Math.max(0.2, Math.min(1, recovered)));
        }

        // CAP OFFSET: Prevent ghost target from flying out of realistic bounds
        this.sharedOffset.x = Math.max(-1200, Math.min(1200, this.sharedOffset.x));
        this.sharedOffset.y = Math.max(-600, Math.min(600, this.sharedOffset.y));

        console.log(`Ghost knowledge update. Shared Offset:`, this.sharedOffset);
    }

    calculateShot(tank, target, env) {
        // 1. Create the "Ghost Target" (Aim Point = Actual Target + Shared Knowledge)
        const aimX = (target.x + target.width / 2) + this.sharedOffset.x;
        const aimY = (target.y - target.height / 2) + this.sharedOffset.y;

        const ghostProxy = { 
            x: aimX - target.width / 2, 
            y: aimY + target.height / 2, 
            width: target.width, 
            height: target.height,
            name: target.name + "-ghost"
        };

        // 2. Parabolic Math (Includes wind as requested: "It can calculate for wind simply on the first shot")
        const weaponId = tank.selectedWeapon || 'default';
        const planned = this.planShot(tank, ghostProxy, env, weaponId);
        
        if (!planned || !Number.isFinite(planned.angle)) {
            // DETERMINISTIC FALLBACK: Point directly at ghost target
            const originX = tank.x + tank.width / 2;
            const originY = tank.y - tank.height;
            const dx = aimX - originX;
            const dy = aimY - originY;
            return {
                angle: this.clampAngle(Math.atan2(-dy, dx)),
                power: 60
            };
        }

        // Restrict power to 60 or less on the very first shot of the match (no knowledge yet)
        const isMatchStart = this.sharedOffset.x === 0 && this.sharedOffset.y === 0;
        const targetName = target?.name || 'unknown';
        const targetX = target.x + target.width / 2;
        const originX = tank.x + tank.width / 2;
        const dx = Math.abs(targetX - originX);
        const gravity = Math.max(0.05, env?.gravity ?? state.gravity ?? 0.1);

        // Simple 80s-style range cap: prevents unnecessary "skyline" power.
        const ballisticCap = Math.max(30, Math.min(100, (1.35 * Math.sqrt(dx * gravity)) / 0.2));
        const streak = this.sideHitStreaks.get(targetName) || 0;
        const streakCapFactor = 1 - Math.min(0.25, streak * 0.1);
        const powerCap = Math.max(25, Math.min(100, ballisticCap * streakCapFactor));
        const scale = this.powerScaleByTarget.get(targetName) || 1;

        let power = planned.power * scale;
        if (isMatchStart) {
            power = Math.min(60, power);
        }
        power = Math.max(10, Math.min(powerCap, power));

        this.lastShotMeta.set(targetName, {
            power,
            angle: planned.angle,
            edgeMode: state.activeEdgeBehavior || 'impact'
        });
        
        return {
            angle: planned.angle,
            power: power
        };
    }
}
