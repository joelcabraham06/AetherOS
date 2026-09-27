/**
 * Automated Verification Suite for AetherOS Micro-Kernel
 * Tests VFS operations, Memory Allocator, CPU Process Scheduler, and Shell System Calls.
 */

const { VirtualFileSystem } = require('../core/vfs');
const { VirtualMemoryManager } = require('../core/memory');
const { CPUScheduler } = require('../core/scheduler');
const { AetherKernel } = require('../core/kernel');
const { AetherShell } = require('../core/shell');

function runTests() {
    console.log("==========================================");
    console.log("🧪 Running AetherOS Kernel Verification Suite");
    console.log("==========================================\n");

    let passed = 0;
    let failed = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${testName}`);
            failed++;
        }
    }

    // 1. VFS Tests
    const vfs = new VirtualFileSystem();
    assert(vfs.root !== null, "VFS Root Initialization");
    
    let mkRes = vfs.mkdir("/home/user/Projects");
    assert(mkRes.success === true, "VFS Directory Creation (/home/user/Projects)");

    let wrRes = vfs.writeFile("/home/user/Projects/test.txt", "Hello AetherOS!");
    assert(wrRes.success === true, "VFS File Writing");

    let rdRes = vfs.readFile("/home/user/Projects/test.txt");
    assert(rdRes.success === true && rdRes.content === "Hello AetherOS!", "VFS File Reading Content Verification");

    // 2. Memory Allocator Tests
    const vmm = new VirtualMemoryManager(65536, 4); // 64MB RAM
    let statsInit = vmm.getMemoryStats();
    assert(statsInit.usedKB > 0, "Memory Manager Kernel Initial Reservation");

    let allocRes = vmm.allocate(201, 8192, "TestApp");
    assert(allocRes.success === true && allocRes.allocatedKB === 8192, "VMM Allocation (8MB Paged)");

    let freeRes = vmm.free(201);
    assert(freeRes.success === true && freeRes.freedKB === 8192, "VMM De-allocation & Frame Recycling");

    // 3. CPU Scheduler Tests
    const scheduler = new CPUScheduler(2);
    const pcb1 = scheduler.createProcess("AudioEngine", 4, 1);
    assert(pcb1.pid >= 100 && pcb1.state === "READY", "CPU Scheduler PCB Creation");

    const testProcs = [
        { pid: 301, name: "P1", burstTime: 5, priority: 2 },
        { pid: 302, name: "P2", burstTime: 2, priority: 1 },
        { pid: 303, name: "P3", burstTime: 4, priority: 3 }
    ];
    const rrSim = scheduler.runSimulation(testProcs, "ROUND_ROBIN", 2);
    assert(rrSim.ganttChart.length > 0 && rrSim.avgWaitingTime > 0, "Round-Robin CPU Scheduler Simulation");

    const sjfSim = scheduler.runSimulation(testProcs, "SJF", 2);
    assert(sjfSim.avgWaitingTime <= rrSim.avgWaitingTime, "SJF Optimization Efficiency Verification");

    // 4. Kernel System Calls & Shell Integration Tests
    const kernel = new AetherKernel();
    const shell = new AetherShell(kernel);

    let sysInfoOut = shell.execute("sysinfo");
    assert(sysInfoOut.includes("AetherOS Host:"), "Shell command 'sysinfo'");

    let psOut = shell.execute("ps");
    assert(psOut.includes("PID") && psOut.includes("systemd"), "Shell command 'ps'");

    let spawnOut = shell.execute("spawn Calculator 4 2");
    assert(spawnOut.includes("Spawned process"), "Shell command 'spawn Calculator'");

    let benchOut = shell.execute("bench");
    assert(benchOut.includes("CPU Scheduling Benchmark"), "Shell command 'bench'");

    console.log("\n==========================================");
    console.log(`Test Execution Summary: ${passed} Passed, ${failed} Failed`);
    console.log("==========================================\n");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
