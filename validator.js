class Validator {
    constructor() {
        this.chain = [];
    }

    getLastJobHash() {
        return this.chain.length > 0 ? this.chain[this.chain.length - 1].hash : null;
    }

    validate(job) {
        const lastJobHash = this.getLastJobHash();
        // Add validation logic here (e.g., check job properties, hash validity, etc.)
        if (job.previousHash !== lastJobHash) {
            throw new Error('Invalid job. Previous hash does not match.');
        }
        // If valid, add the job to the chain
        this.chain.push(job);
        return true;
    }
}

// Export the Validator class
module.exports = Validator;