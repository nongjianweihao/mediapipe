export interface Point {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

export type PoseLandmarks = Point[];

export enum JumpState {
    GROUND = 'GROUND',
    JUMP_UP = 'JUMP_UP',
    AIR = 'AIR',
    LANDING = 'LANDING'
}

export class JumpCounter {
    private count: number = 0;
    private state: JumpState = JumpState.GROUND;
    private lastAnkleY: number = 1.0; // 1.0 is bottom of screen
    private groundThreshold: number = 0.85; // Below this is ground (approx)
    private airThreshold: number = 0.75; // Above this is air (approx)

    // Landmarks indices
    // Left Shoulder: 11, Right Shoulder: 12
    // Left Hip: 23, Right Hip: 24
    // Left Ankle: 27, Right Ankle: 28

    constructor() {}

    public isReady(landmarks: PoseLandmarks): boolean {
        if (!landmarks || landmarks.length === 0) return false;

        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];

        // Check visibility (arbitrary threshold 0.5)
        const isVisible = (p: Point) => p.visibility && p.visibility > 0.6;

        if (!isVisible(leftAnkle) || !isVisible(rightAnkle) ||
            !isVisible(leftShoulder) || !isVisible(rightShoulder) ||
            !isVisible(leftHip) || !isVisible(rightHip)) {
            return false;
        }

        // Check if full body is roughly within frame (y coords between 0 and 1)
        // And ensure they are not too close (head shouldn't be cut off, feet shouldn't be cut off)
        const minY = Math.min(leftShoulder.y, rightShoulder.y);
        const maxY = Math.max(leftAnkle.y, rightAnkle.y);

        if (minY < 0.05 || maxY > 0.95) {
            // Too close to edges
            return false;
        }

        return true;
    }

    public process(landmarks: PoseLandmarks): { count: number; state: JumpState, isJumping: boolean } {
        if (!landmarks || landmarks.length === 0) {
            return { count: this.count, state: this.state, isJumping: false };
        }

        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];

        // Use average of ankles y
        const currentAnkleY = (leftAnkle.y + rightAnkle.y) / 2;

        // Determine if ankles are visible
        if ((leftAnkle.visibility && leftAnkle.visibility < 0.5) ||
            (rightAnkle.visibility && rightAnkle.visibility < 0.5)) {
             // Lost tracking, hold state
             return { count: this.count, state: this.state, isJumping: false };
        }

        // Logic:
        // Ground -> Going Up (dy < 0) -> Air (Y < threshold) -> Going Down (dy > 0) -> Ground

        switch (this.state) {
            case JumpState.GROUND:
                // If we are moving up significantly
                if (currentAnkleY < this.lastAnkleY - 0.02) {
                    this.state = JumpState.JUMP_UP;
                }
                break;

            case JumpState.JUMP_UP:
                // If we passed the air threshold
                if (currentAnkleY < this.airThreshold) {
                    this.state = JumpState.AIR;
                }
                // If we started going down before hitting air threshold (small hop or noise)
                else if (currentAnkleY > this.lastAnkleY) {
                    this.state = JumpState.GROUND;
                }
                break;

            case JumpState.AIR:
                // If we start falling
                if (currentAnkleY > this.lastAnkleY) {
                    this.state = JumpState.LANDING;
                }
                break;

            case JumpState.LANDING:
                // If we hit ground threshold
                if (currentAnkleY > this.groundThreshold) {
                    this.count++;
                    this.state = JumpState.GROUND;
                    // Trigger "Count" event here if needed
                }
                // If we start going up again without hitting ground (double jump?) - unlikely in rope skipping
                break;
        }

        this.lastAnkleY = currentAnkleY;

        return {
            count: this.count,
            state: this.state,
            isJumping: this.state === JumpState.AIR || this.state === JumpState.JUMP_UP
        };
    }

    public getCount(): number {
        return this.count;
    }

    public reset(): void {
        this.count = 0;
        this.state = JumpState.GROUND;
        this.lastAnkleY = 1.0;
    }
}
