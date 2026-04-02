'use strict';

class JobMetrics {
    constructor() {
        this.jobStats = {};
    }

    trackJobStart(jobId) {
        if (!this.jobStats[jobId]) {
            this.jobStats[jobId] = { startTime: new Date(), endTime: null, status: 'running' };
        }
    }

    trackJobEnd(jobId) {
        if (this.jobStats[jobId]) {
            this.jobStats[jobId].endTime = new Date();
            this.jobStats[jobId].status = 'completed';
        }
    }

    getJobDuration(jobId) {
        const job = this.jobStats[jobId];
        if (job && job.endTime) {
            return (job.endTime - job.startTime) / 1000; // duration in seconds
        }
        return null;
    }

    getJobStats() {
        return this.jobStats;
    }
}

// Example usage:
// const metrics = new JobMetrics();
// metrics.trackJobStart('job1');
// metrics.trackJobEnd('job1');
// console.log(metrics.getJobDuration('job1')); // logs job duration in seconds

module.exports = JobMetrics;
