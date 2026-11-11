/** Common port every audited bot implements. Audit only bots your org owns and opted in. */
export interface BotPort {
  readonly name: string;
  respond(prompt: string): Promise<string>;
}
