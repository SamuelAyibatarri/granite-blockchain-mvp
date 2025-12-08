interface Proof {
    coef_1: bigint;
    coef_2: bigint;
    coef_3: bigint;
    coef_4: bigint;
    coef_5: bigint;
}

type Params = [bigint, bigint, bigint, bigint, bigint];

export function createProof(arg: Params): Proof {
    const argSet = new Set(arg);
    if (argSet.size !== arg.length) throw new Error("All params must be unique!");
    const [a, b, c, d, e] = arg;
    if (a.toString().length !== 5 || b.toString().length !== 5 || c.toString().length !== 5 || d.toString().length !== 5 || e.toString().length !== 5 ) {
        throw new Error("All parameters must be 5 numbers long!");
    }
    
    const proof: Proof = {
        coef_1: a + b + c + d + e,
        coef_2: a*b + a*c + a*d + a*e + b*c + b*d + b*e + c*d + c*e + d*e,
        coef_3: a*b*c + a*b*d + a*b*e + a*c*d + a*c*e + a*d*e + b*c*d + b*c*e + b*d*e + c*d*e,
        coef_4: a*b*c*d + a*b*c*e + a*b*d*e + a*c*d*e + b*c*d*e,
        coef_5: a*b*c*d*e
    };
    console.log("This is the length of the first string: ", a.toString().length)
    return proof;
}

export function verifyRoot(proof: Proof, originalParam: bigint): boolean {
    const root = -originalParam;
    const result = 
        (root ** 5n) + 
        (proof.coef_1 * (root ** 4n)) + 
        (proof.coef_2 * (root ** 3n)) + 
        (proof.coef_3 * (root ** 2n)) + 
        (proof.coef_4 * root) + 
        proof.coef_5;
    return result === 0n; 
}

const myParams: Params = [12375n, 27987n, 37438n, 47487n, 57986n];

const myProof = createProof(myParams);
console.log("Proof (Coefficients):", myProof);

console.log("--- Verifying Correct Roots ---");
console.log("Verifying root for param 1235n:", verifyRoot(myProof, 12375n));
console.log("Verifying root for param 2987n:", verifyRoot(myProof, 27987n));
console.log("Verifying root for param 3438n:", verifyRoot(myProof, 37438n));
console.log("Verifying root for param 4487n:", verifyRoot(myProof, 47487n));
console.log("Verifying root for param 5986n:", verifyRoot(myProof, 57986n));

console.log("--- Verifying Incorrect Root ---");
console.log("Verifying non-root (testing -7n):", verifyRoot(myProof, 7n));