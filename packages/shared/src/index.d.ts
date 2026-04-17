export interface User {
    id: string;
    email: string | null;
    displayName: string;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface Group {
    id: string;
    name: string;
    description: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface GroupMembership {
    id: string;
    groupId: string;
    userId: string;
    role: 'owner' | 'member';
    joinedAt: string;
}
export interface HealthStatus {
    status: 'ok';
}
export interface SuccessResponse<T> {
    ok: true;
    data: T;
}
export interface ErrorResponse {
    ok: false;
    error: {
        code: string;
        message: string;
    };
}
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
