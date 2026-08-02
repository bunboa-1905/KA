/**
 * KA SURVIVAL - PLAYER ENTITY
 * Builds 3D Player Character Mesh, manages movement physics and animations
 */
export class Player {
    constructor(scene) {
        this.scene = scene;

        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = 0;
        this.targetRotation = 0;

        this.walkSpeed = 6.5;
        this.runSpeed = 12.0;
        this.currentSpeed = 0;

        this.isMoving = false;
        this.isRunning = false;
        this.walkTimer = 0;

        this.mesh = new THREE.Group();
        this.playerBody = new THREE.Group();
        this.mesh.add(this.playerBody);

        this.buildMesh();
        this.scene.add(this.mesh);
    }

    buildMesh() {
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe4e1, flatShading: true });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0xff80ab, flatShading: true });
        const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xff1744, flatShading: true });
        const eyesMat = new THREE.MeshBasicMaterial({ color: 0x2979ff });
        const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const blushMat = new THREE.MeshBasicMaterial({ color: 0xff80ab, transparent: true, opacity: 0.7 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffcdd2, flatShading: true });
        const overallsMat = new THREE.MeshStandardMaterial({ color: 0x42a5f5, flatShading: true });
        const sockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, flatShading: true });

        // Head
        this.headMesh = new THREE.Group();
        this.headMesh.position.set(0, 1.75, 0);

        const headCube = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.65, 0.65), skinMat);
        headCube.castShadow = true;
        this.headMesh.add(headCube);

        const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.72), hairMat);
        hairTop.position.set(0, 0.24, 0);
        this.headMesh.add(hairTop);

        const frontBangs = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.2, 0.15), hairMat);
        frontBangs.position.set(0, 0.15, 0.32);
        this.headMesh.add(frontBangs);

        // Twin Tails
        this.leftPonytail = new THREE.Group();
        this.leftPonytail.position.set(-0.4, 0.1, -0.1);
        const leftTailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), hairMat);
        leftTailMesh.position.set(-0.05, -0.22, 0);
        leftTailMesh.castShadow = true;
        this.leftPonytail.add(leftTailMesh);
        this.leftPonytail.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.25), ribbonMat));
        this.headMesh.add(this.leftPonytail);

        this.rightPonytail = new THREE.Group();
        this.rightPonytail.position.set(0.4, 0.1, -0.1);
        const rightTailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), hairMat);
        rightTailMesh.position.set(0.05, -0.22, 0);
        rightTailMesh.castShadow = true;
        this.rightPonytail.add(rightTailMesh);
        this.rightPonytail.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.25), ribbonMat));
        this.headMesh.add(this.rightPonytail);

        // Eyes & Blush
        const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.04), eyesMat);
        leftEye.position.set(-0.16, 0.02, 0.33);
        const leftSparkle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.05), eyeHighlightMat);
        leftSparkle.position.set(-0.14, 0.05, 0.34);

        const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.04), eyesMat);
        rightEye.position.set(0.16, 0.02, 0.33);
        const rightSparkle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.05), eyeHighlightMat);
        rightSparkle.position.set(0.18, 0.05, 0.34);

        this.headMesh.add(leftEye); this.headMesh.add(leftSparkle);
        this.headMesh.add(rightEye); this.headMesh.add(rightSparkle);

        const leftBlush = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), blushMat);
        leftBlush.position.set(-0.2, -0.08, 0.33);
        const rightBlush = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), blushMat);
        rightBlush.position.set(0.2, -0.08, 0.33);
        this.headMesh.add(leftBlush); this.headMesh.add(rightBlush);

        this.playerBody.add(this.headMesh);

        // Torso & Backpack
        const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.75, 0.36), overallsMat);
        torsoMesh.position.set(0, 1.0, 0);
        torsoMesh.castShadow = true;
        this.playerBody.add(torsoMesh);

        const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.22), new THREE.MeshStandardMaterial({ color: 0xffeb3b, flatShading: true }));
        backpack.position.set(0, 1.0, -0.26);
        backpack.castShadow = true;
        this.playerBody.add(backpack);

        // Arms & Pink Axe
        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.42, 1.3, 0);
        const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), skinMat);
        leftArmMesh.position.set(0, -0.3, 0);
        this.leftArm.add(leftArmMesh);
        this.playerBody.add(this.leftArm);

        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.42, 1.3, 0);
        const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), skinMat);
        rightArmMesh.position.set(0, -0.3, 0);
        this.rightArm.add(rightArmMesh);

        const axeGroup = new THREE.Group();
        axeGroup.position.set(0, -0.65, 0.15);
        axeGroup.rotation.x = Math.PI / 4;
        axeGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.0, 0.07), new THREE.MeshStandardMaterial({ color: 0x8d6e63, flatShading: true })));
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.36), new THREE.MeshStandardMaterial({ color: 0xff4081, flatShading: true }));
        blade.position.set(0, 0.3, 0.12);
        axeGroup.add(blade);
        this.rightArm.add(axeGroup);
        this.playerBody.add(this.rightArm);

        // Legs
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.16, 0.55, 0);
        this.leftLeg.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), skinMat));
        const leftSock = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.22, 0.23), sockMat);
        leftSock.position.set(0, -0.32, 0);
        this.leftLeg.add(leftSock);
        const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.28), shoeMat);
        leftBoot.position.set(0, -0.48, 0.03);
        this.leftLeg.add(leftBoot);
        this.playerBody.add(this.leftLeg);

        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.16, 0.55, 0);
        this.rightLeg.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), skinMat));
        const rightSock = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.22, 0.23), sockMat);
        rightSock.position.set(0, -0.32, 0);
        this.rightLeg.add(rightSock);
        const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.28), shoeMat);
        rightBoot.position.set(0, -0.48, 0.03);
        this.rightLeg.add(rightBoot);
        this.playerBody.add(this.rightLeg);
    }

    update(deltaTime, inputVector, cameraYaw) {
        const { moveX, moveZ, isRunning } = inputVector;
        this.isRunning = isRunning;

        const inputLength = Math.hypot(moveX, moveZ);
        this.isMoving = inputLength > 0.08;

        if (this.isMoving) {
            const normX = moveX / Math.max(1, inputLength);
            const normZ = moveZ / Math.max(1, inputLength);

            const sinYaw = Math.sin(cameraYaw);
            const cosYaw = Math.cos(cameraYaw);

            const worldMoveX = normX * cosYaw - normZ * sinYaw;
            const worldMoveZ = normX * sinYaw + normZ * cosYaw;

            const baseSpeed = this.isRunning ? this.runSpeed : this.walkSpeed;
            this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, baseSpeed, deltaTime * 10);

            this.position.x += worldMoveX * this.currentSpeed * deltaTime;
            this.position.z += worldMoveZ * this.currentSpeed * deltaTime;

            this.targetRotation = Math.atan2(worldMoveX, worldMoveZ);
            let diff = this.targetRotation - this.rotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.rotation += diff * Math.min(1.0, deltaTime * 14);

            this.walkTimer += deltaTime * (this.isRunning ? 16 : 10);
            const legAngle = Math.sin(this.walkTimer) * 0.6;
            this.leftLeg.rotation.x = legAngle;
            this.rightLeg.rotation.x = -legAngle;
            this.leftArm.rotation.x = -legAngle;
            this.rightArm.rotation.x = legAngle;

            if (this.leftPonytail && this.rightPonytail) {
                const hairSway = Math.sin(this.walkTimer * 1.2) * 0.25;
                this.leftPonytail.rotation.z = 0.2 + hairSway;
                this.rightPonytail.rotation.z = -0.2 - hairSway;
            }
        } else {
            this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, 0, deltaTime * 12);
            this.leftLeg.rotation.x = 0; this.rightLeg.rotation.x = 0;
            this.leftArm.rotation.x = 0; this.rightArm.rotation.x = 0;
        }

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
    }
}
