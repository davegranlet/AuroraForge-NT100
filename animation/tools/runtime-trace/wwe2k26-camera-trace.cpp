#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <tlhelp32.h>
#include <fstream>
#include <iostream>
#include <string>

static DWORD findPid(const char* image) {
  HANDLE s=CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS,0); if(s==INVALID_HANDLE_VALUE) return 0;
  PROCESSENTRY32 e{sizeof(e)}; DWORD pid=0;
  if(Process32First(s,&e)) do { if(_stricmp(e.szExeFile,image)==0){pid=e.th32ProcessID;break;} } while(Process32Next(s,&e));
  CloseHandle(s); return pid;
}
static uintptr_t moduleBase(DWORD pid,const char* name) {
  HANDLE s=CreateToolhelp32Snapshot(TH32CS_SNAPMODULE|TH32CS_SNAPMODULE32,pid); if(s==INVALID_HANDLE_VALUE) return 0;
  MODULEENTRY32 m{sizeof(m)}; uintptr_t b=0;
  if(Module32First(s,&m)) do { if(_stricmp(m.szModule,name)==0){b=(uintptr_t)m.modBaseAddr;break;} } while(Module32Next(s,&m));
  CloseHandle(s); return b;
}
int main(int argc,char**argv){
  const char* out=argc>1?argv[1]:"runtime-camera-trace.jsonl"; DWORD pid=findPid("WWE2K26_x64.exe");
  if(!pid){std::cerr<<"WWE2K26_x64.exe is not running; refusing to launch it\n";return 2;}
  if(!DebugActiveProcess(pid)){std::cerr<<"DebugActiveProcess failed: "<<GetLastError()<<"\n";return 3;}
  uintptr_t base=moduleBase(pid,"WWE2K26_x64.exe"); const uintptr_t rva=0x15FE860; BYTE* bp=(BYTE*)(base+rva); HANDLE p=OpenProcess(PROCESS_ALL_ACCESS,FALSE,pid);
  BYTE original=0; SIZE_T n=0; ReadProcessMemory(p,bp,&original,1,&n); BYTE cc=0xCC; WriteProcessMemory(p,bp,&cc,1,&n); FlushInstructionCache(p,bp,1);
  std::ofstream f(out,std::ios::app); f<<"{\"event\":\"attached\",\"pid\":"<<pid<<",\"moduleBase\":"<<base<<",\"breakpointRva\":"<<rva<<"}\n";
  DEBUG_EVENT ev{}; bool done=false;
  while(WaitForDebugEvent(&ev,1000)){ DWORD cont=DBG_CONTINUE;
    if(ev.dwDebugEventCode==EXCEPTION_DEBUG_EVENT && ev.u.Exception.ExceptionRecord.ExceptionCode==EXCEPTION_BREAKPOINT){
      HANDLE t=OpenThread(THREAD_GET_CONTEXT|THREAD_SET_CONTEXT|THREAD_SUSPEND_RESUME,FALSE,ev.dwThreadId); CONTEXT c{}; c.ContextFlags=CONTEXT_FULL; GetThreadContext(t,&c);
      f<<"{\"event\":\"camera_pose_breakpoint\",\"thread\":"<<ev.dwThreadId<<",\"rip\":"<<c.Rip<<",\"rcx\":"<<c.Rcx<<",\"rdx\":"<<c.Rdx<<",\"r8\":"<<c.R8<<",\"r9\":"<<c.R9<<"}\n"; f.flush(); CloseHandle(t); done=true;
    } else if(ev.dwDebugEventCode==EXIT_PROCESS_DEBUG_EVENT) done=true;
    ContinueDebugEvent(ev.dwProcessId,ev.dwThreadId,cont); if(done) break;
  }
  WriteProcessMemory(p,bp,&original,1,&n); FlushInstructionCache(p,bp,1); DebugActiveProcessStop(pid); CloseHandle(p); return 0;
}
