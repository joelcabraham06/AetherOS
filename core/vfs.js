/**
 * AetherOS Virtual File System (VFS)
 * Implements a POSIX-like hierarchical in-memory filesystem with nodes, permissions, and paths.
 */

class VFSNode {
    constructor(name, type = 'file', content = '', parent = null) {
        this.name = name;
        this.type = type; // 'file' or 'directory'
        this.content = content;
        this.parent = parent;
        this.children = {}; // name -> VFSNode
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.size = type === 'file' ? content.length : 0;
    }
}

class VirtualFileSystem {
    constructor() {
        this.root = new VFSNode('/', 'directory');
        this.currentDir = this.root;
        this._initDefaultStructure();
    }

    _initDefaultStructure() {
        this.mkdir('/bin');
        this.mkdir('/etc');
        this.mkdir('/home');
        this.mkdir('/home/user');
        this.mkdir('/home/user/Documents');
        this.mkdir('/home/user/Desktop');
        this.mkdir('/sys');
        this.mkdir('/var');
        this.mkdir('/var/log');

        // Initial system files
        this.writeFile('/etc/os-release', 'NAME="AetherOS"\nVERSION="2.5.0-LTS"\nID=aetheros\nBUILD_ID=2026.09.27\nPRETTY_NAME="AetherOS Live Real-Time Web Kernel"');
        this.writeFile('/home/user/README.txt', 'Welcome to AetherOS - Next-Gen Live Web Operating System & Kernel Simulator.\n\nType "help" in the terminal for shell commands.\nLaunch apps from Desktop or Start Menu!');
        this.writeFile('/home/user/Documents/kernel_notes.md', '# AetherOS Kernel Spec\n- Subsystems: Process Manager, Virtual Memory, POSIX VFS, CPU Scheduler\n- Scheduler Algos: Round-Robin, FCFS, Priority, SJF\n- Memory Paging: 4KB Virtual Pages');
        this.writeFile('/var/log/syslog.log', '[00:00:01] AetherOS Kernel v2.5.0 Booting...\n[00:00:02] CPU Scheduler initialized [Quantum=200ms]\n[00:00:02] Memory Manager initialized [Total: 64MB Virtual RAM]\n[00:00:03] POSIX VFS mounted at /\n[00:00:04] Window Manager GUI started successfully.');
    }

    resolvePath(pathStr) {
        if (!pathStr) return this.currentDir;

        let node = pathStr.startsWith('/') ? this.root : this.currentDir;
        let parts = pathStr.split('/').filter(p => p.length > 0 && p !== '.');

        for (let part of parts) {
            if (part === '..') {
                if (node.parent) node = node.parent;
            } else {
                if (node.children[part]) {
                    node = node.children[part];
                } else {
                    return null; // Not found
                }
            }
        }
        return node;
    }

    getAbsolutePath(node = this.currentDir) {
        let path = [];
        let curr = node;
        while (curr) {
            if (curr.name !== '/') path.unshift(curr.name);
            curr = curr.parent;
        }
        return '/' + path.join('/');
    }

    mkdir(pathStr) {
        let parts = pathStr.split('/').filter(p => p.length > 0);
        let dirName = parts.pop();
        let parentPath = '/' + parts.join('/');
        let parentNode = this.resolvePath(parentPath);

        if (!parentNode || parentNode.type !== 'directory') {
            return { success: false, error: 'Parent directory does not exist' };
        }

        if (parentNode.children[dirName]) {
            return { success: false, error: 'Directory already exists' };
        }

        let newDir = new VFSNode(dirName, 'directory', '', parentNode);
        parentNode.children[dirName] = newDir;
        return { success: true, node: newDir };
    }

    writeFile(pathStr, content = '') {
        let parts = pathStr.split('/').filter(p => p.length > 0);
        let fileName = parts.pop();
        let parentPath = '/' + parts.join('/');
        let parentNode = this.resolvePath(parentPath);

        if (!parentNode || parentNode.type !== 'directory') {
            return { success: false, error: 'Parent directory does not exist' };
        }

        let node = parentNode.children[fileName];
        if (node) {
            if (node.type === 'directory') {
                return { success: false, error: 'Is a directory' };
            }
            node.content = content;
            node.size = content.length;
            node.updatedAt = new Date();
        } else {
            node = new VFSNode(fileName, 'file', content, parentNode);
            parentNode.children[fileName] = node;
        }
        return { success: true, node };
    }

    readFile(pathStr) {
        let node = this.resolvePath(pathStr);
        if (!node) return { success: false, error: 'File not found' };
        if (node.type === 'directory') return { success: false, error: 'Is a directory' };
        return { success: true, content: node.content, node };
    }

    listDir(pathStr = '') {
        let node = pathStr ? this.resolvePath(pathStr) : this.currentDir;
        if (!node) return { success: false, error: 'Directory not found' };
        if (node.type !== 'directory') return { success: false, error: 'Not a directory' };

        let items = Object.values(node.children).map(child => ({
            name: child.name,
            type: child.type,
            size: child.size,
            updatedAt: child.updatedAt
        }));
        return { success: true, items, path: this.getAbsolutePath(node) };
    }

    changeDir(pathStr) {
        let node = this.resolvePath(pathStr);
        if (!node) return { success: false, error: 'No such file or directory' };
        if (node.type !== 'directory') return { success: false, error: 'Not a directory' };
        this.currentDir = node;
        return { success: true, path: this.getAbsolutePath(node) };
    }

    remove(pathStr) {
        let node = this.resolvePath(pathStr);
        if (!node) return { success: false, error: 'No such file or directory' };
        if (!node.parent) return { success: false, error: 'Cannot remove root directory' };

        delete node.parent.children[node.name];
        return { success: true };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VirtualFileSystem, VFSNode };
}
