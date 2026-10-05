export type CoreCertificationState="RUNNING"|"AWAITING_FULFILLMENT"|"PASSED"|"FAILED"|"PENDING_RESUME";
export interface CertificationPhase { phase:"A"|"B"; completedSteps:string[]; pendingSteps:string[]; state:CoreCertificationState; lastUpdated:string; maxWaitMs?:number; resumeAfter?:string; }
export interface CoreV1Lock { locked:boolean; lockedAt:string; lockedBy:string; milestoneId:"core-v1"; reason:"Architecture frozen for certification execution"; allowedChanges:string[]; }
