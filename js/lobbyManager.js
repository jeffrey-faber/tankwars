export class LobbyManager {
    constructor(tanks) {
        this.tanks = tanks;
        this.currentPlayerIndex = -1;
        this.done = false;
    }

    start() {
        this.currentPlayerIndex = -1;
        this.done = false;
        this.findNextHuman();
    }

    findNextHuman() {
        let found = false;
        for (let i = this.currentPlayerIndex + 1; i < this.tanks.length; i++) {
            if (!this.tanks[i].isAI) {
                this.currentPlayerIndex = i;
                found = true;
                break;
            }
        }
        if (!found) {
            this.done = true;
        }
    }

    next() {
        this.findNextHuman();
    }

    getCurrentPlayerIndex() {
        return this.currentPlayerIndex;
    }

    isDone() {
        return this.done;
    }
}
