import * as THREE from 'three';

export class Character {
    constructor(scene) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.parts = {};

        // Settings
        this.speed = 4;
        this.sprintSpeed = 8;
        this.turnSpeed = 10;
        this.jumpForce = 8;

        // Physics
        this.velocity = new THREE.Vector3();
        this.onGround = false;

        this.buildCharacter();
        this.scene.add(this.mesh);
    }

    buildCharacter() {
        const material = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            roughness: 0.4,
            metalness: 0.1
        });

        // Root container for offset
        // Torso
        const torsoGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.6, 12);
        const torso = new THREE.Mesh(torsoGeo, material);
        torso.position.y = 1.1;
        torso.castShadow = true;
        this.mesh.add(torso);
        this.parts.torso = torso;

        // Head
        const headGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const head = new THREE.Mesh(headGeo, material);
        head.position.y = 0.5;
        torso.add(head);
        this.parts.head = head;

        // Arms
        const armGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.5, 8);

        // Left Arm Group (Shoulder)
        const lArmGroup = new THREE.Group();
        lArmGroup.position.set(0.3, 0.2, 0);
        torso.add(lArmGroup);
        this.parts.lArmGroup = lArmGroup;

        const lArm = new THREE.Mesh(armGeo, material);
        lArm.position.y = -0.25; // Pivot at top
        lArmGroup.add(lArm);
        this.parts.lArm = lArm;

        // Right Arm Group (Shoulder)
        const rArmGroup = new THREE.Group();
        rArmGroup.position.set(-0.3, 0.2, 0);
        torso.add(rArmGroup);
        this.parts.rArmGroup = rArmGroup;

        const rArm = new THREE.Mesh(armGeo, material);
        rArm.position.y = -0.25;
        rArmGroup.add(rArm);
        this.parts.rArm = rArm;

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.6, 8);

        // Left Leg Group (Hip)
        const lLegGroup = new THREE.Group();
        lLegGroup.position.set(0.15, -0.3, 0);
        torso.add(lLegGroup);
        this.parts.lLegGroup = lLegGroup;

        const lLeg = new THREE.Mesh(legGeo, material);
        lLeg.position.y = -0.3;
        lLegGroup.add(lLeg);
        this.parts.lLeg = lLeg;

        // Right Leg Group (Hip)
        const rLegGroup = new THREE.Group();
        rLegGroup.position.set(-0.15, -0.3, 0);
        torso.add(rLegGroup);
        this.parts.rLegGroup = rLegGroup;

        const rLeg = new THREE.Mesh(legGeo, material);
        rLeg.position.y = -0.3;
        rLegGroup.add(rLeg);
        this.parts.rLeg = rLeg;
    }

    update(time, input, delta) {
        // Determine State
        let state = 'IDLE';

        // Check for actions first
        if (input.isPressed('kick')) state = 'KICK';
        else if (input.isPressed('punch')) state = 'PUNCH';
        else if (input.isPressed('wave')) state = 'WAVE';
        else if (input.isPressed('dance')) state = 'DANCE';
        else if (!this.onGround) state = 'JUMP';
        else if (input.isPressed('forward') || input.isPressed('backward') || input.isPressed('left') || input.isPressed('right')) {
            state = input.isPressed('sprint') ? 'RUN' : 'WALK';
        }

        // Apply Animation
        this.animate(state, time, delta);
    }

    animate(state, time, delta) {
        const speed = state === 'RUN' ? 10 : 5;
        const t = time * speed;

        // Reset or Blend to default
        const lerpFactor = 10 * delta;

        // Helper for smooth transition
        const lerpRot = (obj, x, y, z) => {
            obj.rotation.x += (x - obj.rotation.x) * lerpFactor;
            obj.rotation.y += (y - obj.rotation.y) * lerpFactor;
            obj.rotation.z += (z - obj.rotation.z) * lerpFactor;
        };

        if (state === 'IDLE') {
            // Breathe
            lerpRot(this.parts.lArmGroup, 0, 0, 0.1);
            lerpRot(this.parts.rArmGroup, 0, 0, -0.1);
            lerpRot(this.parts.lLegGroup, 0, 0, 0);
            lerpRot(this.parts.rLegGroup, 0, 0, 0);
            this.parts.head.position.y = 0.5 + Math.sin(time * 2) * 0.01;
        } else if (state === 'WALK' || state === 'RUN') {
            // Walk/Run Cycle
            const legAmp = state === 'RUN' ? 1.0 : 0.6;
            const armAmp = state === 'RUN' ? 1.0 : 0.4;

            lerpRot(this.parts.lLegGroup, Math.sin(t) * legAmp, 0, 0);
            lerpRot(this.parts.rLegGroup, Math.sin(t + Math.PI) * legAmp, 0, 0);

            lerpRot(this.parts.lArmGroup, Math.sin(t + Math.PI) * armAmp, 0, 0.1);
            lerpRot(this.parts.rArmGroup, Math.sin(t) * armAmp, 0, -0.1);

            // Bob
            this.parts.torso.position.y = 1.1 + Math.abs(Math.sin(t)) * (state === 'RUN' ? 0.1 : 0.05);
        } else if (state === 'KICK') {
            lerpRot(this.parts.rLegGroup, -Math.PI / 2, 0, 0); // Kick forward
            lerpRot(this.parts.lArmGroup, -0.5, 0, 0.5); // Balance
            lerpRot(this.parts.rArmGroup, 0.5, 0, -0.5);
        } else if (state === 'PUNCH') {
            lerpRot(this.parts.rArmGroup, -Math.PI / 2, -0.5, 0); // Punch forward
            lerpRot(this.parts.lArmGroup, 0.5, 0.5, 0); // Guard
            this.parts.torso.rotation.y += (0.2 - this.parts.torso.rotation.y) * lerpFactor;
        } else if (state === 'JUMP') {
             lerpRot(this.parts.lLegGroup, 0.5, 0, 0.2);
             lerpRot(this.parts.rLegGroup, -0.2, 0, -0.2);
             lerpRot(this.parts.lArmGroup, -2.5, 0, 0);
             lerpRot(this.parts.rArmGroup, -2.5, 0, 0);
        } else if (state === 'WAVE') {
            lerpRot(this.parts.rArmGroup, 0, 0, Math.PI - 0.5 + Math.sin(time * 10) * 0.5);
        } else if (state === 'DANCE') {
            // Spin and flail
             lerpRot(this.parts.lArmGroup, Math.sin(time * 5), 0, Math.PI/2);
             lerpRot(this.parts.rArmGroup, Math.cos(time * 5), 0, -Math.PI/2);
             this.parts.torso.rotation.y = Math.sin(time * 3);
        }

        // Reset torso rotation if not punching/dancing
        if (state !== 'PUNCH' && state !== 'DANCE') {
            this.parts.torso.rotation.y += (0 - this.parts.torso.rotation.y) * lerpFactor;
        }
    }

    animateTalk(time) {
        // Special animation override for talking
        const t = time * 8;
        this.parts.head.rotation.x = Math.sin(t * 0.5) * 0.05;
        this.parts.head.rotation.y = Math.cos(t * 0.3) * 0.05;

        // Hand gestures
        this.parts.lArmGroup.rotation.z = 0.5 + Math.sin(t) * 0.1;
        this.parts.rArmGroup.rotation.z = -0.5 + Math.sin(t + 1) * 0.1;

        this.parts.lArmGroup.rotation.x = -0.5 + Math.cos(t * 0.7) * 0.2;
        this.parts.rArmGroup.rotation.x = -0.5 + Math.sin(t * 0.7) * 0.2;
    }
}
