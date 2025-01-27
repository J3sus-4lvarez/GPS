interface Window {
    ws: WebSocket;
}

declare module '*.png' {
    const value: string;
    export default value;
}
declare module '*.jpg' {
    const value: string;
    export default value;
}

declare module '*.jpeg' {
    const value: string;
    export default value;
}

declare module '*.gif' {
    const value: string;
    export default value;
}

declare module '../../Back-end/utils/formatearFecha' {
    export function formatDate(date: Date): string;
    export function utc(date: string): Date;
  }