// @category AuroraForge

import ghidra.app.script.GhidraScript;
import ghidra.app.util.importer.MessageLog;
import nativeaot.NativeAotAnalyzer;

public class RunNativeAotAnalyzer extends GhidraScript {
    @Override
    public void run() throws Exception {
        NativeAotAnalyzer analyzer = new NativeAotAnalyzer();
        MessageLog log = new MessageLog();
        boolean result = analyzer.added(currentProgram, currentProgram.getMemory(), monitor, log);
        println("NativeAOT analyzer result: " + result);
        println(log.toString());
    }
}
