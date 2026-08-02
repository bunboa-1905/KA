/**
 * KA SURVIVAL - ENVIRONMENT ENTITY
 * Builds 3D Terrain, forest trees, boulders, campfire, and wildflower patches
 */
import { WORLD_CONFIG } from '../data/WorldData.js';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.propsGroup = new THREE.Group();
        this.scene.add(this.propsGroup);

        this.buildTerrain();
        this.buildForestAndRocks();
        this.buildCampfire();
    }

    buildTerrain() {
        const groundGeo = new THREE.PlaneGeometry(WORLD_CONFIG.mapSize, WORLD_CONFIG.mapSize, 40, 40);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x4caf50,
            roughness: 0.8,
            flatShading: true
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const gridHelper = new THREE.GridHelper(WORLD_CONFIG.mapSize, 100, 0x388e3c, 0x388e3c);
        gridHelper.position.y = 0.01;
        gridHelper.material.opacity = 0.25;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }

    buildForestAndRocks() {
        const leafColors = [0x2e7d32, 0x388e3c, 0x43a047];

        const createTree = (x, z, scale = 1) => {
            const treeGroup = new THREE.Group();
            treeGroup.position.set(x, 0, z);

            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9, flatShading: true });
            const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.8 * scale, 3.5 * scale, 0.8 * scale), trunkMat);
            trunk.position.y = (3.5 * scale) / 2;
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            treeGroup.add(trunk);

            for (let i = 0; i < 3; i++) {
                const size = (2.6 - i * 0.7) * scale;
                const leaves = new THREE.Mesh(
                    new THREE.BoxGeometry(size, 1.6 * scale, size),
                    new THREE.MeshStandardMaterial({ color: leafColors[i], roughness: 0.7, flatShading: true })
                );
                leaves.position.y = 3.0 * scale + i * 1.2 * scale;
                leaves.castShadow = true;
                leaves.receiveShadow = true;
                treeGroup.add(leaves);
            }
            return treeGroup;
        };

        for (let i = 0; i < WORLD_CONFIG.treeCount; i++) {
            let x = (Math.random() - 0.5) * (WORLD_CONFIG.mapSize - 40);
            let z = (Math.random() - 0.5) * (WORLD_CONFIG.mapSize - 40);
            if (Math.hypot(x, z) < WORLD_CONFIG.safeZoneRadius) continue;
            this.propsGroup.add(createTree(x, z, 0.8 + Math.random() * 0.6));
        }

        const flowerColors = [0xff4081, 0xffeb3b, 0xab47bc, 0x00e676, 0xff9100];
        for (let i = 0; i < WORLD_CONFIG.flowerCount; i++) {
            let x = (Math.random() - 0.5) * (WORLD_CONFIG.mapSize - 50);
            let z = (Math.random() - 0.5) * (WORLD_CONFIG.mapSize - 50);
            const fGroup = new THREE.Group();
            fGroup.position.set(x, 0, z);
            const stem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), new THREE.MeshBasicMaterial({ color: 0x4caf50 }));
            stem.position.y = 0.2;
            fGroup.add(stem);
            const petal = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.35), new THREE.MeshBasicMaterial({ color: flowerColors[i % flowerColors.length] }));
            petal.position.y = 0.45;
            fGroup.add(petal);
            this.propsGroup.add(fGroup);
        }
    }

    buildCampfire() {
        const fireGroup = new THREE.Group();
        fireGroup.position.set(WORLD_CONFIG.campfirePosition.x, 0, WORLD_CONFIG.campfirePosition.z);

        const logMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, flatShading: true });
        for (let i = 0; i < 4; i++) {
            const log = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1.2), logMat);
            log.rotation.y = (i * Math.PI) / 2;
            log.position.y = 0.15;
            log.castShadow = true;
            fireGroup.add(log);
        }

        const flame = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.8, 0.5),
            new THREE.MeshBasicMaterial({ color: 0xff5722 })
        );
        flame.position.y = 0.55;
        fireGroup.add(flame);

        const fireLight = new THREE.PointLight(0xff7d00, 2.5, 12);
        fireLight.position.y = 1.0;
        fireGroup.add(fireLight);

        this.propsGroup.add(fireGroup);
    }
}
