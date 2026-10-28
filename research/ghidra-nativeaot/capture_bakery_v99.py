import frida
import sys
import threading

exe = r"D:\AuroraForge-Aug26\_research\bakery-2.0.1\extracted\win-x64\Bakery.CLI.exe"
args = [
    exe, "bake", "-i", r"D:\AuroraForge-Aug26\MyGM-StartingCash-50M\BakeMe",
    "-v", "9.9", "--encrypt-header", "-o",
    r"D:\AuroraForge-Aug26\MyGM-StartingCash-50M\analysis\frida-oracle\zzz_MyGM_StartingCash_50M.cak",
]

script_source = r'''
const base = Process.getModuleByName('Bakery.CLI.exe').base;
function at(offset) { return base.add(offset); }
function span(p) {
  const data = p.readPointer();
  const length = p.add(Process.pointerSize).readU32();
  return { data, length, hex: data.readByteArray(length) ? data.readByteArray(length).unwrap().readByteArray(length) : null };
}
function hexBytes(address, length) {
  return Array.from(new Uint8Array(address.readByteArray(length))).map(x => x.toString(16).padStart(2,'0')).join('');
}
function hookReturn(name, offset) {
  Interceptor.attach(at(offset), {
    onLeave(retval) { send(name + '=0x' + retval.toUInt32().toString(16).padStart(8,'0')); }
  });
}
hookReturn('fnv-low-return', 0x207a0);
hookReturn('sfmt-next', 0x21b40);
hookReturn('crc-buffer', 0x204e0);
hookReturn('scramble', 0xc0e0);
Interceptor.attach(at(0xeaa0), {
  onEnter(args) {
    this.s = args[1]; this.data = this.s.readPointer(); this.length = this.s.add(Process.pointerSize).readU32();
    send('chacha-in[' + this.length + ']=' + hexBytes(this.data, this.length));
  },
  onLeave() { send('chacha-out=' + hexBytes(this.data, this.length)); }
});
Interceptor.attach(at(0x20520), {
  onEnter(args) {
    const data = args[0].readPointer(); const length = args[0].add(Process.pointerSize).readU32();
    this.seed = args[1]; send('hash-in seed=0x' + this.seed.toString(16) + ' data=' + hexBytes(data,length));
  },
  onLeave(retval) { send('hash-out=0x' + retval.toString(16)); }
});
Interceptor.attach(at(0xe2e0), {
  onEnter(args) { send('v99-enter'); },
  onLeave(retval) { send('v99-key=0x' + retval.toUInt32().toString(16).padStart(8,'0')); }
});
'''

device = frida.get_local_device()
pid = device.spawn(args)
session = device.attach(pid)
script = session.create_script(script_source)
script.on("message", lambda message, data: print(message.get("payload", message)))
script.load()
device.resume(pid)
done = threading.Event()
session.on("detached", lambda reason, crash: done.set())
try:
    done.wait(60)
except KeyboardInterrupt:
    pass
