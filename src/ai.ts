
const model = "@hf/thebloke/deepseek-coder-6.7b-base-awq";
const maxPromptChars = 4096;

// given the prefix, how long can the suffix be (or vice versa)
function getOtherLen(knownLen: number, maxRes: number, budget: number) {
    return Math.min(budget - knownLen, maxRes);
}

// determines ways to split our character budget between prefix and suffix
function createSplits(prefixLen: number, suffixLen: number, budget: number) {
    if(prefixLen + suffixLen < budget) {
        // no need to trim, just send everything over
        return [[prefixLen, suffixLen]];
    }
    
    const splits = [0.5, 0.25, 0.75, 1];

    return [...new Set(splits.map(split => {
        const pre = Math.min(Math.floor(budget * split), prefixLen);
        const suf = getOtherLen(pre, suffixLen, budget);
        return [pre, suf];
    }))];
}

// creates prompts based on possible splits according to createSplits
function makePrompts(prefix: string, suffix: string, maxChars: number = maxPromptChars) {
    const fimBegin = "<｜fim▁begin｜>";
    const fimHole = "<｜fim▁hole｜>";
    const fimEnd = "<｜fim▁end｜>";

    const prefixLen = prefix.length;
    const suffixLen = suffix.length;
    const budget = maxChars - fimBegin.length - fimHole.length - fimEnd.length;

    const splits = createSplits(prefixLen, suffixLen, budget);

    return splits.map(([pre, suf]) => 
        fimBegin + prefix.substring(prefix.length - pre) + fimHole + suffix.substring(0, suf) + fimEnd);
}

export default class WorkersAI {
    constructor(private accountId: string, private apiKey: string) {}

    query = (prompt: string) => {
        const body = JSON.stringify({ prompt });
        return fetch(
            `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model}`,
            {
                headers: { Authorization: "Bearer " + this.apiKey },
                method: "POST",
                body,
            }
        )
            .then(res => res.json())
            .then((res: any) => {
                //console.log(prompt, res);
                return res["result"]["response"];
            })
    }

    infill = async (prefix: string, suffix: string) => {
        const prompts = makePrompts(prefix, suffix);
        const responses = await Promise.all(prompts.map(this.query));
        return responses;
    }
}