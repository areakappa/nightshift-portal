export class OpenAIRequest {
    Request: string = "";
    Prompt: string = "";
    constructor(request: string, prompt: string) {
        this.Request = request;
        this.Prompt = prompt;
    }
}
