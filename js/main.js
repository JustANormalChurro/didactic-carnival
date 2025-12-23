import * as THREE from 'three';
import { World } from './World.js';
import { Character } from './Character.js';
import { Input } from './Input.js';
import { AudioManager } from './AudioManager.js';
import { Cutscene } from './Cutscene.js';

class Game {
    constructor() {
        this.world = new World();
        this.character = new Character(this.world.scene);
        this.input = new Input();
        this.audio = new AudioManager();
        this.cutscene = new Cutscene(this);

        this.clock = new THREE.Clock();
        this.cameraMode = 'cutscene'; // cutscene, third, first
        this.cameraOffset = new THREE.Vector3(0, 3, 5);
        this.lookAtOffset = new THREE.Vector3(0, 1, 0);

        // Auto move state for cutscenes
        this.autoMoveTarget = null;
        this.autoMoveDuration = 0;
        this.autoMoveTimer = 0;
        this.autoMoveStartPos = new THREE.Vector3();

        this.init();
    }

    init() {
        document.getElementById('start-btn').addEventListener('click', () => {
            this.cutscene.start();
        });

        // Set initial camera for cutscene (Head on)
        this.world.camera.position.set(0, 1.5, 2);
        this.world.camera.lookAt(0, 1.5, 0);

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    setCameraMode(mode) {
        this.cameraMode = mode;
        if (mode === 'third') {
            this.cameraOffset.set(0, 3, 5);
        } else if (mode === 'first') {
            this.cameraOffset.set(0, 1.6, 0.2); // Inside head
        } else if (mode === 'cutscene') {
            this.world.camera.position.set(0, 1.5, 2.5); // Close up face
            this.world.camera.lookAt(0, 1.5, 0);
        }
    }

    moveCharacterTo(target, duration) {
        this.autoMoveTarget = target.clone();
        this.autoMoveDuration = duration;
        this.autoMoveTimer = 0;
        this.autoMoveStartPos = this.character.mesh.position.clone();
    }

    // Easing function
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    characterAction(name) {
        // Trigger specific action state (simple override for now)
        // In a complex system, we'd inject this into the input or character state
        // For now, we simulate input or force state in Character update
        // We'll handle this by temporarily setting a flag or letting animation logic handle it
        if (name === 'kick') this.input.keys.kick = true;
        if (name === 'jump') {
             this.input.keys.jump = true;
             this.audio.playJumpSound();
        }

        setTimeout(() => {
            if (name === 'kick') this.input.keys.kick = false;
            if (name === 'jump') this.input.keys.jump = false;
        }, 500);
    }

    update(delta) {
        // Cutscene Logic
        this.cutscene.update(delta);

        // Movement Logic
        const moveSpeed = this.input.isPressed('sprint') ? this.character.sprintSpeed : this.character.speed;
        const rotateSpeed = this.character.turnSpeed;

        if (this.cutscene.active) {
            // Auto Move
            if (this.autoMoveTarget) {
                this.autoMoveTimer += delta;
                let t = Math.min(this.autoMoveTimer / this.autoMoveDuration, 1);

                // Apply Easing
                const easedT = this.easeInOutQuad(t);

                this.character.mesh.position.lerpVectors(this.autoMoveStartPos, this.autoMoveTarget, easedT);

                // Face target
                const lookPos = this.autoMoveTarget.clone();
                lookPos.y = this.character.mesh.position.y;
                this.character.mesh.lookAt(lookPos);

                // Animate legs
                if (t < 1) {
                    const isSprinting = this.autoMoveDuration < 1.0; // Heuristic
                    this.character.animate(isSprinting ? 'RUN' : 'WALK', this.clock.getElapsedTime(), delta);
                } else {
                    this.character.animate('IDLE', this.clock.getElapsedTime(), delta);
                    this.autoMoveTarget = null;
                }
            }
        } else {
            // Player Control
            if (this.input.isPressed('toggleCamera') && !this.input.pressed.has('toggleCameraProcessed')) {
                this.setCameraMode(this.cameraMode === 'third' ? 'first' : 'third');
                this.input.pressed.add('toggleCameraProcessed');
                setTimeout(() => this.input.pressed.delete('toggleCameraProcessed'), 200);
            }

            const direction = new THREE.Vector3();
            if (this.input.isPressed('forward')) direction.z -= 1;
            if (this.input.isPressed('backward')) direction.z += 1;
            if (this.input.isPressed('left')) direction.x -= 1;
            if (this.input.isPressed('right')) direction.x += 1;

            if (direction.length() > 0) {
                direction.normalize();

                // Adjust direction based on camera (if third person)
                // Simply rotate input vector by camera angle
                // For simplicity, we keep world-space controls or relative to character?
                // Standard game: W is forward relative to camera view.

                // Get camera forward vector (projected to XZ plane)
                const camForward = new THREE.Vector3();
                this.world.camera.getWorldDirection(camForward);
                camForward.y = 0;
                camForward.normalize();

                const camRight = new THREE.Vector3(-camForward.z, 0, camForward.x);

                const moveVec = new THREE.Vector3();
                moveVec.addScaledVector(camForward, -direction.z); // -z is forward in input, but -z is forward in world?
                // actually input forward is -1 z.

                // Wait, let's simplify.
                // W (forward) -> negative Z local.

                const forward = new THREE.Vector3(0, 0, -1);
                forward.applyQuaternion(this.world.camera.quaternion);
                forward.y = 0;
                forward.normalize();

                const right = new THREE.Vector3(1, 0, 0);
                right.applyQuaternion(this.world.camera.quaternion);
                right.y = 0;
                right.normalize();

                const finalDir = new THREE.Vector3();
                if (this.input.isPressed('forward')) finalDir.add(forward);
                if (this.input.isPressed('backward')) finalDir.sub(forward);
                if (this.input.isPressed('right')) finalDir.add(right);
                if (this.input.isPressed('left')) finalDir.sub(right);

                if (finalDir.length() > 0) {
                     finalDir.normalize();
                     this.character.velocity.x = finalDir.x * moveSpeed;
                     this.character.velocity.z = finalDir.z * moveSpeed;

                     // Rotate character to face movement direction
                     const targetRotation = Math.atan2(finalDir.x, finalDir.z);
                     // Smooth rotation
                     const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), targetRotation);
                     this.character.mesh.quaternion.slerp(q, delta * rotateSpeed);
                }
            } else {
                this.character.velocity.x = 0;
                this.character.velocity.z = 0;
            }

            // Jump
            if (this.input.isPressed('jump') && this.character.onGround) {
                this.character.velocity.y = this.character.jumpForce;
                this.character.onGround = false;
                this.audio.playJumpSound();
            }

            // Sound on step (simple timer)
            if (this.character.onGround && direction.length() > 0) {
                if (!this.stepTimer) this.stepTimer = 0;
                this.stepTimer += delta;
                const stepInterval = this.input.isPressed('sprint') ? 0.3 : 0.5;
                if (this.stepTimer > stepInterval) {
                    this.audio.playStepSound();
                    this.stepTimer = 0;
                }
            }

            // Apply Physics
            this.character.velocity.y -= 20 * delta; // Gravity
            this.character.mesh.position.addScaledVector(this.character.velocity, delta);

            // Floor collision
            if (this.character.mesh.position.y < 0) {
                this.character.mesh.position.y = 0;
                this.character.velocity.y = 0;
                this.character.onGround = true;
            }

            // Box/Object Interaction (Kick/Punch)
            if (this.input.isPressed('kick') || this.input.isPressed('punch')) {
                const range = 3;
                const force = this.input.isPressed('kick') ? 50 : 30; // Massive force

                // Check simple distance to center of character
                // A better way would be a cone check in front, but distance + facing is okay for now

                // We will apply an "Explosion" of force from the character's position forward
                const impactPos = this.character.mesh.position.clone().add(
                    new THREE.Vector3(0, 0, 1).applyQuaternion(this.character.mesh.quaternion).multiplyScalar(1)
                );

                // Throttle this so it doesn't apply every frame (Input is continuous)
                if (!this.actionCooldown) {
                     this.world.applyExplosionForce(impactPos, force, range);
                     this.audio.playImpactSound();
                     this.actionCooldown = 0.5; // Seconds
                }
            }

            if (this.actionCooldown > 0) this.actionCooldown -= delta;

            // Player Collision with Objects (Simple Push)
            for (const obj of this.world.physicsObjects) {
                const dist = this.character.mesh.position.distanceTo(obj.mesh.position);
                const minDist = 0.5 + obj.radius;
                if (dist < minDist) {
                    const pushDir = new THREE.Vector3().subVectors(obj.mesh.position, this.character.mesh.position).normalize();
                    obj.velocity.addScaledVector(pushDir, 10 * delta); // Push object
                }
            }

            this.character.update(this.clock.getElapsedTime(), this.input, delta);
        }

        // Update Camera
        if (this.cameraMode !== 'cutscene') {
            const targetPos = this.character.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)); // Look at head/chest

            // Calc offset rotation based on some camera controller?
            // For now, simple follow
            const desiredPos = this.character.mesh.position.clone().add(this.cameraOffset);

            // Soft follow
            this.world.camera.position.lerp(desiredPos, delta * 2);
            this.world.camera.lookAt(targetPos);
        } else {
             // In cutscene, we might want to ensure we look at the character
             if (this.cutscene.active) {
                const targetPos = this.character.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
                this.world.camera.lookAt(targetPos);
             }
        }

        // Update World Physics
        this.world.updatePhysics(delta);

        this.world.render();
    }

    animate() {
        requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();
        this.update(delta);
    }
}

new Game();
