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
    private driftFactor: number = 0.05;

    // Landmarks indices
    // Left Ankle: 27, Right Ankle: 28
    // Left Wrist: 15, Right Wrist: 16

    constructor() {}

    public process(landmarks: PoseLandmarks): { count: number; state: JumpState, isJumping: boolean } {
        if (!landmarks || landmarks.length === 0) {
            return { count: this.count, state: this.state, isJumping: false };
        }

        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];

        // Use average of ankles y
        const currentAnkleY = (leftAnkle.y + rightAnkle.y) / 2;

        // Calculate relative height based on Hip to Ankle distance to normalize for camera distance
        // But for simplicity v1, let's stick to relative screen coords assuming full body in frame.
        // Better: Dynamic thresholding based on initial calibration?
        // Let's stick to state machine with delta.

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
