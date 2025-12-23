import * as THREE from 'three';

export class World {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });

        this.init();
    }

    init() {
        this.setupRenderer();
        this.setupEnvironment();
        this.setupLights();
        this.setupObjects();
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupEnvironment() {
        // White Void effect
        this.scene.background = new THREE.Color(0xf0f0f0);
        this.scene.fog = new THREE.Fog(0xf0f0f0, 10, 50);

        // Floor
        const planeGeometry = new THREE.PlaneGeometry(100, 100);
        const planeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.1
        });
        this.floor = new THREE.Mesh(planeGeometry, planeMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        this.scene.add(dirLight);
    }

    setupObjects() {
        // The Kickable Box
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        this.kickableBox = new THREE.Mesh(boxGeometry, boxMaterial);
        this.kickableBox.position.set(5, 0.5, 0);
        this.kickableBox.castShadow = true;
        this.kickableBox.receiveShadow = true;
        this.scene.add(this.kickableBox);

        // Physics tracking for the box
        this.boxVelocity = new THREE.Vector3();
        this.boxOnGround = true;

        // Scattered colorful objects
        this.physicsObjects = []; // Store all interactable objects

        // Add the main kickable box to physics objects
        this.physicsObjects.push({
            mesh: this.kickableBox,
            velocity: new THREE.Vector3(),
            mass: 1.0,
            radius: 0.7 // Approx collision radius
        });

        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffaa00, 0x00aaff];
        for (let i = 0; i < 50; i++) {
            const size = 0.5 + Math.random() * 0.5;
            const geometry = Math.random() > 0.5 ?
                new THREE.BoxGeometry(size, size, size) :
                new THREE.SphereGeometry(size / 2, 32, 32);

            const material = new THREE.MeshStandardMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                roughness: 0.2,
                metalness: 0.3
            });

            const mesh = new THREE.Mesh(geometry, material);
            const x = (Math.random() - 0.5) * 80; // Widen area
            const z = (Math.random() - 0.5) * 80;

            // Avoid center area (Start) and Box area
            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue; // Center
            if (Math.abs(x - 5) < 3 && Math.abs(z) < 3) continue; // Box area

            mesh.position.set(x, size/2, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            // Add to physics
            this.physicsObjects.push({
                mesh: mesh,
                velocity: new THREE.Vector3(),
                mass: size, // Larger is heavier
                radius: size / 1.5
            });
        }
    }

    applyExplosionForce(center, force, radius) {
        for (const obj of this.physicsObjects) {
            const dist = center.distanceTo(obj.mesh.position);
            if (dist < radius) {
                const direction = new THREE.Vector3().subVectors(obj.mesh.position, center).normalize();
                direction.y += 0.5; // Lift up
                direction.normalize();

                // Inverse square law ish
                const power = force * (1 - dist / radius) / obj.mass;
                obj.velocity.addScaledVector(direction, power);
            }
        }
    }

    updatePhysics(delta) {
        for (const obj of this.physicsObjects) {
            // Gravity
            obj.velocity.y -= 20 * delta;

            // Friction
            obj.velocity.x *= 0.98;
            obj.velocity.z *= 0.98;

            // Apply Velocity
            obj.mesh.position.addScaledVector(obj.velocity, delta);

            // Floor Collision
            const halfSize = obj.radius; // approx
            if (obj.mesh.position.y < halfSize) {
                obj.mesh.position.y = halfSize;
                obj.velocity.y *= -0.5; // Bounce
                if (Math.abs(obj.velocity.y) < 1) obj.velocity.y = 0;
            }

            // Wall boundaries (Void limits)
            const limit = 45;
            if (obj.mesh.position.x > limit) { obj.mesh.position.x = limit; obj.velocity.x *= -0.8; }
            if (obj.mesh.position.x < -limit) { obj.mesh.position.x = -limit; obj.velocity.x *= -0.8; }
            if (obj.mesh.position.z > limit) { obj.mesh.position.z = limit; obj.velocity.z *= -0.8; }
            if (obj.mesh.position.z < -limit) { obj.mesh.position.z = -limit; obj.velocity.z *= -0.8; }
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
