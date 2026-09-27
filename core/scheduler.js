/**
 * AetherOS CPU Process Scheduler Engine
 * Simulates OS Process Control Blocks (PCB), Scheduling Algorithms (Round-Robin, Priority, FCFS, SJF)
 * and Gantt Chart Metrics (Turnaround Time, Waiting Time, Response Time).
 */

class ProcessControlBlock {
    constructor(pid, name, burstTime, priority = 1, memorySizeKB = 4096) {
        this.pid = pid;
        this.name = name;
        this.burstTime = burstTime;         // Total CPU execution units required
        this.remainingTime = burstTime;     // Remaining execution units
        this.priority = priority;           // Lower integer = Higher priority
        this.memorySizeKB = memorySizeKB;   // Virtual RAM required
        this.state = 'READY';               // 'READY', 'RUNNING', 'WAITING', 'TERMINATED'
        this.arrivalTime = 0;
        this.startTime = -1;
        this.completionTime = 0;
        this.waitingTime = 0;
        this.turnaroundTime = 0;
    }
}

class CPUScheduler {
    constructor(timeQuantum = 2) {
        this.processes = [];
        this.readyQueue = [];
        this.activeProcess = null;
        this.timeQuantum = timeQuantum;
        this.clockTicks = 0;
        this.nextPid = 100;
        this.algorithm = 'ROUND_ROBIN'; // 'ROUND_ROBIN', 'FCFS', 'SJF', 'PRIORITY'
        this.executionLog = [];
    }

    createProcess(name, burstTime, priority = 1, memoryKB = 4096) {
        const pid = this.nextPid++;
        const pcb = new ProcessControlBlock(pid, name, burstTime, priority, memoryKB);
        pcb.arrivalTime = this.clockTicks;
        this.processes.push(pcb);
        this.readyQueue.push(pcb);
        this.executionLog.push({ tick: this.clockTicks, event: 'SPAWN', pcb: { ...pcb } });
        return pcb;
    }

    killProcess(pid) {
        const pcb = this.processes.find(p => p.pid === pid);
        if (!pcb) return { success: false, error: 'Process not found' };

        pcb.state = 'TERMINATED';
        this.readyQueue = this.readyQueue.filter(p => p.pid !== pid);
        if (this.activeProcess && this.activeProcess.pid === pid) {
            this.activeProcess = null;
        }
        this.executionLog.push({ tick: this.clockTicks, event: 'KILL', pid });
        return { success: true, pcb };
    }

    tick() {
        this.clockTicks++;

        if (this.readyQueue.length === 0 && !this.activeProcess) {
            return { tick: this.clockTicks, active: null, queueLength: 0 };
        }

        // Sort ready queue based on selected algorithm
        if (this.algorithm === 'SJF') {
            this.readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
        } else if (this.algorithm === 'PRIORITY') {
            this.readyQueue.sort((a, b) => a.priority - b.priority);
        }

        if (!this.activeProcess || this.activeProcess.state === 'TERMINATED') {
            if (this.readyQueue.length > 0) {
                this.activeProcess = this.readyQueue.shift();
                this.activeProcess.state = 'RUNNING';
                if (this.activeProcess.startTime === -1) {
                    this.activeProcess.startTime = this.clockTicks;
                }
            }
        }

        if (this.activeProcess) {
            this.activeProcess.remainingTime--;
            this.executionLog.push({ tick: this.clockTicks, activePid: this.activeProcess.pid, name: this.activeProcess.name });

            if (this.activeProcess.remainingTime <= 0) {
                this.activeProcess.state = 'TERMINATED';
                this.activeProcess.completionTime = this.clockTicks;
                this.activeProcess.turnaroundTime = this.activeProcess.completionTime - this.activeProcess.arrivalTime;
                this.activeProcess.waitingTime = this.activeProcess.turnaroundTime - this.activeProcess.burstTime;
                this.activeProcess = null;
            } else if (this.algorithm === 'ROUND_ROBIN' && (this.clockTicks % this.timeQuantum === 0)) {
                this.activeProcess.state = 'READY';
                this.readyQueue.push(this.activeProcess);
                this.activeProcess = null;
            }
        }

        return {
            tick: this.clockTicks,
            active: this.activeProcess ? { pid: this.activeProcess.pid, name: this.activeProcess.name } : null,
            queueLength: this.readyQueue.length
        };
    }

    runSimulation(processList, algorithm = 'ROUND_ROBIN', quantum = 2) {
        this.algorithm = algorithm;
        this.timeQuantum = quantum;
        this.clockTicks = 0;
        this.processes = [];
        this.readyQueue = [];
        this.activeProcess = null;
        this.executionLog = [];

        // Clone and add processes
        processList.forEach(p => {
            let pcb = new ProcessControlBlock(p.pid || this.nextPid++, p.name, p.burstTime, p.priority || 1, p.memoryKB || 4096);
            pcb.arrivalTime = p.arrivalTime || 0;
            this.processes.push(pcb);
            this.readyQueue.push(pcb);
        });

        const maxTicks = 1000;
        let ticks = 0;
        const gantt = [];

        while ((this.readyQueue.length > 0 || this.activeProcess) && ticks < maxTicks) {
            ticks++;
            let res = this.tick();
            if (res.active) {
                gantt.push({ tick: ticks, pid: res.active.pid, name: res.active.name });
            } else {
                gantt.push({ tick: ticks, pid: 'IDLE', name: 'IDLE' });
            }
        }

        // Calculate summary metrics
        let totalWaiting = 0;
        let totalTurnaround = 0;
        const metrics = this.processes.map(p => {
            totalWaiting += p.waitingTime;
            totalTurnaround += p.turnaroundTime;
            return {
                pid: p.pid,
                name: p.name,
                burstTime: p.burstTime,
                priority: p.priority,
                waitingTime: p.waitingTime,
                turnaroundTime: p.turnaroundTime
            };
        });

        const avgWaiting = (totalWaiting / (this.processes.length || 1)).toFixed(2);
        const avgTurnaround = (totalTurnaround / (this.processes.length || 1)).toFixed(2);

        return {
            algorithm,
            quantum,
            totalTicks: ticks,
            ganttChart: gantt,
            processMetrics: metrics,
            avgWaitingTime: parseFloat(avgWaiting),
            avgTurnaroundTime: parseFloat(avgTurnaround)
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CPUScheduler, ProcessControlBlock };
}
