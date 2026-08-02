/**
 * KA SURVIVAL - ITEM DROP ENTITY
 * Represents 3D loot items floating on the ground
 */
export class ItemDrop {
    constructor(scene, itemType, position) {
        this.scene = scene;
        this.itemType = itemType;
        this.position = position.clone();
        this.isPickedUp = false;

        this.mesh = new THREE.Group();
        this.buildMesh();
        this.scene.add(this.mesh);
    }

    buildMesh() {
        let color = 0x5d4037;
        if (this.itemType === 'stone') color = 0x78909c;
        if (this.itemType === 'berry') color = 0xff4081;

        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.35, 0.35),
            new THREE.MeshStandardMaterial({ color, flatShading: true })
        );
        cube.castShadow = true;
        this.mesh.add(cube);
        this.mesh.position.copy(this.position);
    }

    update(deltaTime, playerPosition) {
        if (this.isPickedUp) return;

        this.mesh.rotation.y += deltaTime * 2;
        this.mesh.position.y = this.position.y + 0.3 + Math.sin(Date.now() * 0.005) * 0.08;

        const dist = this.mesh.position.distanceTo(playerPosition);
        if (dist < 1.4) {
            this.isPickedUp = true;
            this.destroy();
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}
