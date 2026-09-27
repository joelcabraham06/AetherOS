/**
 * AetherShell - Interactive OS Command-Line Interpreter
 * Parses user terminal commands and routes execution through System Calls to Kernel.
 */

if (typeof require !== 'undefined') {
    var { AetherKernel } = require('./kernel');
}

class AetherShell {
    constructor(kernel) {
        this.kernel = kernel || new AetherKernel();
        this.commandHistory = [];
        this.historyIndex = -1;
    }

    execute(inputLine) {
        const line = inputLine.trim();
        if (!line) return '';

        this.commandHistory.push(line);
        this.historyIndex = this.commandHistory.length;

        const parts = line.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        const cmd = parts[0] ? parts[0].toLowerCase() : '';
        const args = parts.slice(1).map(arg => arg.replace(/^"|"$/g, ''));

        switch (cmd) {
            case 'help':
                return (
                    "⚙️  AetherShell v2.5 Command Matrix:\n" +
                    "  sysinfo       - Display system specifications & uptime\n" +
                    "  ps            - List active process control blocks (PCB)\n" +
                    "  spawn <name>  - Spawn new process into scheduler queue\n" +
                    "  kill <pid>    - Terminate running process by PID\n" +
                    "  mem           - Display virtual RAM & page allocation\n" +
                    "  bench         - Run CPU Scheduling Benchmark Simulation\n" +
                    "  ls [dir]      - List directory contents\n" +
                    "  cd <dir>      - Change working directory\n" +
                    "  pwd           - Print working directory\n" +
                    "  cat <file>    - Output contents of a file\n" +
                    "  write <f> <t> - Write text to file\n" +
                    "  mkdir <dir>   - Create directory\n" +
                    "  rm <path>     - Delete file or directory\n" +
                    "  clear         - Clear terminal screen\n" +
                    "  date          - Display system time\n" +
                    "  version       - Output OS build details"
                );

            case 'sysinfo':
                const info = this.kernel.syscall('sys_info');
                return (
                    `🖥️  AetherOS Host: ${info.hostname}\n` +
                    `📦  Version: ${info.version} (Build ${info.buildId})\n` +
                    `⏱️  Uptime: ${info.uptimeSeconds} seconds\n` +
                    `📊  Active Processes: ${info.processesCount}\n` +
                    `💾  RAM: ${info.memory.usedKB}KB / ${info.memory.totalRamKB}KB (${info.memory.usagePercent}% allocated)`
                );

            case 'ps':
                const psRes = this.kernel.syscall('sys_ps');
                let psOutput = "PID\tNAME\t\tSTATE\tPRIORITY\tBURST\tMEM\n";
                psOutput += "---------------------------------------------------------\n";
                psRes.processes.forEach(p => {
                    psOutput += `${p.pid}\t${p.name.padEnd(12, ' ')}\t${p.state.padEnd(8, ' ')}\t${p.priority}\t\t${p.remainingTime}/${p.burstTime}\t${p.memorySizeKB}KB\n`;
                });
                return psOutput;

            case 'spawn':
                if (!args[0]) return "Error: Usage: spawn <process_name> [burst_time] [priority]";
                const pName = args[0];
                const burst = parseInt(args[1]) || 6;
                const prio = parseInt(args[2]) || 2;
                const spRes = this.kernel.syscall('sys_spawn', pName, burst, prio, 4096);
                if (spRes.success) {
                    return `✅ Spawned process '${pName}' (PID ${spRes.pid}) into CPU scheduler ready queue.`;
                }
                return `❌ Spawn failed: ${spRes.error}`;

            case 'kill':
                if (!args[0]) return "Error: Usage: kill <pid>";
                const pid = parseInt(args[0]);
                const kRes = this.kernel.syscall('sys_kill', pid);
                if (kRes.success) {
                    return `✅ Terminated PID ${pid} and freed memory page frames.`;
                }
                return `❌ Kill failed: ${kRes.error}`;

            case 'mem':
                const mInfo = this.kernel.vmm.getMemoryStats();
                return (
                    `💾  Virtual RAM Allocation Stats:\n` +
                    `  Total RAM:    ${mInfo.totalRamKB} KB (${mInfo.totalRamKB / 1024} MB)\n` +
                    `  Allocated:    ${mInfo.usedKB} KB (${mInfo.usagePercent}%)\n` +
                    `  Free RAM:     ${mInfo.freeKB} KB\n` +
                    `  Page Frames:  ${mInfo.totalFrames - mInfo.freeFrames} / ${mInfo.totalFrames} used (4KB Pages)\n` +
                    `  Page Faults:  ${mInfo.pageFaults}`
                );

            case 'ls':
                const lsRes = this.kernel.syscall('sys_readdir', args[0] || '');
                if (!lsRes.success) return `Error: ${lsRes.error}`;
                let lsStr = `Directory ${lsRes.path}:\n`;
                lsRes.items.forEach(item => {
                    let icon = item.type === 'directory' ? '📁' : '📄';
                    let sizeStr = item.type === 'file' ? `${item.size} B` : '<DIR>';
                    lsStr += `  ${icon}  ${item.name.padEnd(25, ' ')} ${sizeStr}\n`;
                });
                return lsStr;

            case 'cd':
                const cdRes = this.kernel.syscall('sys_chdir', args[0] || '/');
                if (!cdRes.success) return `Error: ${cdRes.error}`;
                return `Changed working directory to ${cdRes.path}`;

            case 'pwd':
                const pwdRes = this.kernel.syscall('sys_getcwd');
                return pwdRes.path;

            case 'cat':
                if (!args[0]) return "Error: Usage: cat <filename>";
                const catRes = this.kernel.syscall('sys_read', args[0]);
                if (!catRes.success) return `Error: ${catRes.error}`;
                return catRes.content;

            case 'write':
                if (args.length < 2) return "Error: Usage: write <filename> <content>";
                const wrRes = this.kernel.syscall('sys_write', args[0], args[1]);
                if (!wrRes.success) return `Error: ${wrRes.error}`;
                return `✅ File '${args[0]}' written (${wrRes.node.size} bytes).`;

            case 'mkdir':
                if (!args[0]) return "Error: Usage: mkdir <dirname>";
                const mkRes = this.kernel.syscall('sys_mkdir', args[0]);
                if (!mkRes.success) return `Error: ${mkRes.error}`;
                return `✅ Directory '${args[0]}' created.`;

            case 'rm':
                if (!args[0]) return "Error: Usage: rm <path>";
                const rmRes = this.kernel.syscall('sys_unlink', args[0]);
                if (!rmRes.success) return `Error: ${rmRes.error}`;
                return `✅ Removed '${args[0]}'.`;

            case 'bench':
                const testProcs = [
                    { pid: 101, name: 'WebBrowser', burstTime: 6, priority: 1 },
                    { pid: 102, name: 'AudioServer', burstTime: 3, priority: 2 },
                    { pid: 103, name: 'Compiler', burstTime: 8, priority: 3 },
                    { pid: 104, name: 'Database', burstTime: 4, priority: 1 }
                ];

                const rrRes = this.kernel.scheduler.runSimulation(testProcs, 'ROUND_ROBIN', 2);
                const sjfRes = this.kernel.scheduler.runSimulation(testProcs, 'SJF', 2);

                return (
                    `⚡  CPU Scheduling Benchmark Simulation Metrics:\n` +
                    `--------------------------------------------------\n` +
                    `[Algorithm: Round-Robin (Quantum=2)]\n` +
                    `  Avg Waiting Time:    ${rrRes.avgWaitingTime} ms\n` +
                    `  Avg Turnaround Time: ${rrRes.avgTurnaroundTime} ms\n\n` +
                    `[Algorithm: Shortest Job First (SJF)]\n` +
                    `  Avg Waiting Time:    ${sjfRes.avgWaitingTime} ms\n` +
                    `  Avg Turnaround Time: ${sjfRes.avgTurnaroundTime} ms\n\n` +
                    `💡 SJF reduced average waiting time by ${(rrRes.avgWaitingTime - sjfRes.avgWaitingTime).toFixed(2)} ms!`
                );

            case 'date':
                return new Date().toString();

            case 'version':
                return `AetherOS Real-Time Kernel v${this.kernel.version} (Build ${this.kernel.buildId})`;

            case 'clear':
                return '__CLEAR__';

            default:
                return `Command not found: '${cmd}'. Type 'help' for available system commands.`;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AetherShell };
}
