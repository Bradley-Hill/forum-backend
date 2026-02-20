export type PaginationSuccess = {
    valid: true;
    page: number;
    pageSize: number;
};

export type PaginationFailure = {
    valid: false;
    error: {
        message: string;
        code: string;
    };
};

export type PaginationResult = PaginationSuccess | PaginationFailure;