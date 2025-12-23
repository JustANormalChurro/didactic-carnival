import * as THREE from 'three';

export class Cutscene {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.timeline = [];
        this.currentIndex = 0;
        this.timer = 0;

        // UI
        this.dialogueContainer = document.getElementById('dialogue-container');
        this.dialogueText = document.getElementById('dialogue-text');
        this.letterboxTop = document.getElementById('letterbox-top');
        this.letterboxBottom = document.getElementById('letterbox-bottom');
        this.controlsInfo = document.getElementById('controls-info');

        this.initTimeline();
    }

    initTimeline() {
        // Helper to create actions
        const say = (text, duration = 3) => ({ type: 'say', text, duration });
        const wait = (duration) => ({ type: 'wait', duration });
        const move = (target, duration) => ({ type: 'move', target, duration });
        const action = (name, duration) => ({ type: 'action', name, duration });
        const camera = (mode) => ({ type: 'camera', mode });

        this.timeline = [
            // Intro
            camera('cutscene'),
            say("Hello. I am Proto.", 3),
            wait(1),
            say("I exist to test your reflexes in this... void.", 4),
            wait(1),

            // Movement Demo
            say("I can move freely. Observe.", 3),
            move(new THREE.Vector3(0, 0, -5), 2),
            wait(0.5),
            move(new THREE.Vector3(0, 0, 0), 2),
            wait(1),

            // Box Interaction
            say("See this box? It is a physics object.", 3),
            move(new THREE.Vector3(4, 0, 0), 2), // Move near box
            say("I can interact with it.", 2),
            action('kick', 0.5), // Kick
            wait(1),

            // Jump Demo
            say("I am also capable of vertical traversal.", 3),
            action('jump', 1),
            wait(1),

            // Controls
            say("Now, it is your turn.", 2),
            say("Use WASD to move.", 3),
            say("SPACE to jump.", 2),
            say("SHIFT to sprint.", 2),
            say("F to kick, G to punch.", 3),
            say("C to toggle camera view.", 3),

            // End
            say("Begin simulation.", 2),
            camera('third')
        ];
    }

    start() {
        this.active = true;
        this.currentIndex = 0;
        this.timer = 0;
        document.body.classList.add('cinematic');
        document.getElementById('start-screen').style.display = 'none';
        this.game.audio.init(); // Ensure audio context starts
        this.processCurrentStep();
    }

    processCurrentStep() {
        if (this.currentIndex >= this.timeline.length) {
            this.end();
            return;
        }

        const step = this.timeline[this.currentIndex];

        switch (step.type) {
            case 'say':
                this.showDialogue(step.text);
                this.timer = step.duration;
                break;
            case 'wait':
                this.hideDialogue();
                this.timer = step.duration;
                break;
            case 'move':
                this.game.moveCharacterTo(step.target, step.duration);
                this.timer = step.duration;
                break;
            case 'action':
                this.game.characterAction(step.name);
                this.timer = step.duration;
                break;
            case 'camera':
                this.game.setCameraMode(step.mode);
                this.currentIndex++;
                this.processCurrentStep(); // Immediate next step
                return;
        }
    }

    update(delta) {
        if (!this.active) return;

        this.timer -= delta;

        // Character "talking" animation if dialogue is open
        if (!this.dialogueContainer.classList.contains('hidden')) {
            this.game.character.animateTalk(this.game.clock.getElapsedTime());
            // Randomly play beep
            if (Math.random() < 0.1) this.game.audio.speak();
        }

        if (this.timer <= 0) {
            this.currentIndex++;
            this.processCurrentStep();
        }
    }

    showDialogue(text) {
        this.dialogueContainer.classList.remove('hidden');
        this.dialogueText.innerText = text;
    }

    hideDialogue() {
        this.dialogueContainer.classList.add('hidden');
    }

    end() {
        this.active = false;
        this.hideDialogue();
        document.body.classList.remove('cinematic');
        this.controlsInfo.classList.remove('hidden');
        this.game.setCameraMode('third');
    }
}
