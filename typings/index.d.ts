export class User {
    public constructor(options?: object)
    public login(username: string, password: string, totp?:string): void
    public logout(): void

    public username: string | null
    public userid: number | null
    
    public on(event: string, listener: function): void
}