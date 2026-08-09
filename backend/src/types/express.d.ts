declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: string;
        name: string;
        mobile: string;
        email?: string | null;
      };
    }
  }
}

export {};
