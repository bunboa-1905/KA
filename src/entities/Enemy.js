/**
 * KA SURVIVAL - ENEMY ENTITY & AI
 * Represents night mobs (Zombies/Wolves) with state-machine AI
 */
export const AI_STATES = {
    IDLE: 'IDLE',
    PATROL: 'PATROL',
    CHASE: 'CHASE',
    ATTACK: 'ATTACK'
};

export class Enemy {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        this.health = 50;
        this.maxHealth = 50;

        this.aiState = AI_STATES.IDLE;
        this.chaseSpeed = 4.5;
        this.attackRange = 1.5;

        this.mesh = new THREE.Group();
        this.buildMesh();
        this.scene.add(this.mesh);
    }

    buildMesh() {
        const mobMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, flatShading: true }); // Dark green zombie
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mobMat);
        head.position.y = 1.5;
        head.castShadow = true;
        this.mesh.add(head);

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.35), mobMat);
        body.position.y = 0.85;
        body.castShadow = true;
        this.mesh.add(body);

        this.mesh.position.copy(this.position);
    }

    update(deltaTime, playerPosition) {
        const distanceToPlayer = this.position.distanceTo(playerPosition);

        if (distanceToPlayer < 12 && distanceToPlayer > this.attackRange) {
            this.aiState = AI_STATES.CHASE;
            const dir = playerPosition.clone().sub(this.position).normalize();
            this.position.x += dir.x * this.chaseSpeed * deltaTime;
            this.position.z += dir.z * this.chaseSpeed * deltaTime;
            this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        } else if (distanceToPlayer <= this.attackRange) {
            this.aiState = AI_STATES.ATTACK;
        } else {
            this.aiState = AI_STATES.IDLE;
        }

        this.mesh.position.copy(this.position);
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}
