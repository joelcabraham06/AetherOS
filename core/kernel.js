/**
 * AetherOS Micro-Kernel Central Engine
 * Integrates Virtual File System (VFS), Virtual Memory Manager (VMM),
 * CPU Scheduler, and System Call Vector Table (syscall handler).
 */

if (typeof require !== 'undefined') {
    var { VirtualFileSystem } = require('./vfs');
    var { VirtualMemoryManager } = require('./memory');
    var { CPUScheduler } = require('./scheduler');
}

class AetherKernel {
    constructor() {
        this.vfs = new VirtualFileSystem();
        this.vmm = new VirtualMemoryManager(65536, 4); // 64MB RAM, 4KB Pages
        this.scheduler = new CPUScheduler(2);
        this.uptimeStart = Date.now();
        this.version = "2.5.0-LTS";
        this.buildId = "2026.09.27";
        this.hostname = "aether-node-1";

        this._initKernelDaemonProcesses();
    }

    _initKernelDaemonProcesses() {
        // Spawn core OS kernel daemons
        this.spawnProcess("systemd", 10, 1, 8192);        // PID 100 System Manager
        this.spawnProcess("vfs_daemon", 5, 2, 4096);       // Storage I/O Daemon
        this.spawnProcess("net_service", 4, 3, 2048);      // Network Stack Daemon
        this.spawnProcess("gui_wm", 8, 1, 12288);          // Window Manager Daemon
    }

    spawnProcess(name, burstTime = 5, priority = 2, memoryKB = 4096) {
        // Check VMM allocation
        const pcb = this.scheduler.createProcess(name, burstTime, priority, memoryKB);
        const memRes = this.vmm.allocate(pcb.pid, memoryKB, name);

        if (!memRes.success) {
            this.scheduler.killProcess(pcb.pid);
            return { success: false, error: memRes.error };
        }

        return { success: true, pid: pcb.pid, pcb, memory: memRes };
    }

    terminateProcess(pid) {
        const res = this.scheduler.killProcess(pid);
        if (res.success) {
            this.vmm.free(pid);
        }
        return res;
    }

    // System Calls Router (POSIX / UNIX System Call Vector)
    syscall(name, ...args) {
        switch (name) {
            // VFS Syscalls
            case 'sys_read':
                return this.vfs.readFile(args[0]);
            case 'sys_write':
                return this.vfs.writeFile(args[0], args[1]);
            case 'sys_mkdir':
                return this.vfs.mkdir(args[0]);
            case 'sys_readdir':
                return this.vfs.listDir(args[0]);
            case 'sys_chdir':
                return this.vfs.changeDir(args[0]);
            case 'sys_unlink':
                return this.vfs.remove(args[0]);
            case 'sys_getcwd':
                return { success: true, path: this.vfs.getAbsolutePath() };

            // Process Syscalls
            case 'sys_spawn':
                return this.spawnProcess(args[0], args[1], args[2], args[3]);
            case 'sys_kill':
                return this.terminateProcess(args[0]);
            case 'sys_ps':
                return { success: true, processes: this.scheduler.processes };

            // System Info Syscalls
            case 'sys_info':
                return {
                    success: true,
                    version: this.version,
                    buildId: this.buildId,
                    hostname: this.hostname,
                    uptimeSeconds: Math.floor((Date.now() - this.uptimeStart) / 1000),
                    memory: this.vmm.getMemoryStats(),
                    processesCount: this.scheduler.processes.length
                };

            default:
                return { success: false, error: `Unknown syscall '${name}'` };
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AetherKernel };
}
