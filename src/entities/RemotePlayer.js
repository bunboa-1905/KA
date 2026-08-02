/**
 * KA SURVIVAL - REMOTE PLAYER ENTITY
 * Renders friend 3D character in co-op mode with position interpolation and name tag
 */
export class RemotePlayer {
    constructor(scene, name = "Friend") {
        this.scene = scene;
        this.name = name;

        this.position = new THREE.Vector3(0, 0, 0);
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.rotation = 0;
        this.targetRotation = 0;

        this.mesh = new THREE.Group();
        this.buildMesh();
        this.scene.add(this.mesh);
    }

    buildMesh() {
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, flatShading: true });
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, flatShading: true });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, flatShading: true });

        const headCube = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.65, 0.65), skinMat);
        headCube.position.y = 1.75;
        headCube.castShadow = true;
        this.mesh.add(headCube);

        const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.38), shirtMat);
        torsoMesh.position.y = 1.0;
        torsoMesh.castShadow = true;
        this.mesh.add(torsoMesh);

        const legGeo = new THREE.BoxGeometry(0.24, 0.6, 0.24);
        const leftLeg = new THREE.Mesh(legGeo, pantsMat);
        leftLeg.position.set(-0.18, 0.3, 0);
        const rightLeg = new THREE.Mesh(legGeo, pantsMat);
        rightLeg.position.set(0.18, 0.3, 0);
        this.mesh.add(leftLeg);
        this.mesh.add(rightLeg);
    }

    updateNetworkState(data) {
        if (data.x !== undefined && data.z !== undefined) {
            this.targetPosition.set(data.x, data.y || 0, data.z);
        }
        if (data.rotation !== undefined) {
            this.targetRotation = data.rotation;
        }
    }

    update(deltaTime) {
        this.position.lerp(this.targetPosition, deltaTime * 12);
        this.rotation = THREE.MathUtils.lerp(this.rotation, this.targetRotation, deltaTime * 12);

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}
