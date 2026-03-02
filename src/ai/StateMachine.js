/**
 * Simple finite state machine for AI behavior.
 * Each state has enter/update/exit callbacks.
 */
export class StateMachine {
    /**
     * @param {object} owner - The entity that owns this state machine
     * @param {string} initialState - Starting state name
     */
    constructor(owner, initialState) {
        this.owner = owner;
        this.states = {};
        this.currentState = null;
        this.currentStateName = null;
        this.previousStateName = null;

        if (initialState) {
            this.initialStateName = initialState;
        }
    }

    /**
     * Register a state.
     * @param {string} name
     * @param {{ enter?: function, update?: function, exit?: function }} config
     */
    addState(name, config) {
        this.states[name] = config;

        // If this is the initial state and we haven't started yet, start it
        if (name === this.initialStateName && !this.currentState) {
            this.setState(name);
        }
    }

    /**
     * Transition to a new state.
     */
    setState(name) {
        if (name === this.currentStateName) return;
        if (!this.states[name]) {
            console.warn(`StateMachine: unknown state "${name}"`);
            return;
        }

        // Exit current state
        if (this.currentState && this.currentState.exit) {
            this.currentState.exit.call(this.owner);
        }

        this.previousStateName = this.currentStateName;
        this.currentStateName = name;
        this.currentState = this.states[name];

        // Enter new state
        if (this.currentState.enter) {
            this.currentState.enter.call(this.owner);
        }
    }

    /**
     * Update current state (call each frame).
     * @param {number} time
     * @param {number} delta
     */
    update(time, delta) {
        if (this.currentState && this.currentState.update) {
            this.currentState.update.call(this.owner, time, delta);
        }
    }

    /**
     * Check if currently in a specific state.
     */
    is(name) {
        return this.currentStateName === name;
    }
}
