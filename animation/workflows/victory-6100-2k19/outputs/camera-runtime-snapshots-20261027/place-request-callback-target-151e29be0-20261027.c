
===== requested=151e29be0 block=.xcode(1452a2000 - 158380fff) =====
FUNCTION FUN_151e29be0 @ 151e29be0
SIGNATURE undefined FUN_151e29be0(void)
CALLERS
from=15883af60 type=DATA function=<data>

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_151e29be0(undefined8 param_1,undefined8 param_2,longlong param_3)

{
  longlong *plVar1;
  int iVar2;
  undefined1 uVar3;
  longlong lVar4;
  undefined8 *puVar5;
  longlong lVar6;
  longlong *plVar7;
  int *piVar8;
  int *piVar9;
  undefined1 auStack_88 [32];
  undefined8 *puStack_68;
  longlong lStack_60;
  longlong lStack_40;
  ulonglong uStack_38;
  
  uStack_38 = _DAT_14467a040 ^ (ulonglong)auStack_88;
  *(undefined8 *)(param_3 + 0x18) = param_2;
  if (*(char *)(param_3 + 0x21) == '\0') {
    lVar4 = *(longlong *)(_DAT_144a65c28 + 0x38);
    if (lVar4 != 0) {
      LOCK();
      *(int *)(lVar4 + 8) = *(int *)(lVar4 + 8) + 1;
      UNLOCK();
    }
    puStack_68 = (undefined8 *)&UNK_144270e80;
    lStack_60 = param_3;
    lStack_40 = lVar4;
    plVar7 = (longlong *)FUN_1428164e0(*(undefined8 *)(_DAT_144a65c28 + 0x10));
    uVar3 = *(undefined1 *)(lVar4 + 0x18);
    *(undefined1 *)((longlong)plVar7 + 0x91) = 0;
    LOCK();
    *(int *)(lVar4 + 8) = *(int *)(lVar4 + 8) + 1;
    UNLOCK();
    puVar5 = (undefined8 *)plVar7[0xb];
    plVar7[0xb] = lVar4;
    if (puVar5 != (undefined8 *)0x0) {
      piVar9 = (int *)(puVar5 + 1);
      LOCK();
      iVar2 = *piVar9;
      *piVar9 = *piVar9 + -1;
      UNLOCK();
      if ((iVar2 == 1) && (piVar9 != (int *)0x0)) {
        (**(code **)*puVar5)(puVar5,1);
      }
    }
    lVar6 = plVar7[0xc];
    plVar7[0xc] = 0;
    if (lVar6 != 0) {
      LOCK();
      piVar9 = (int *)(lVar6 + 0x14);
      iVar2 = *piVar9;
      *piVar9 = *piVar9 + -1;
      UNLOCK();
      if (iVar2 == 1) {
        lVar6 = *(longlong *)(_DAT_144a65c28 + 8);
        FUN_1428166b0(lVar6);
        LOCK();
        piVar9 = (int *)(lVar6 + 0x208);
        *piVar9 = *piVar9 + -1;
        UNLOCK();
      }
    }
    if ((undefined8 *)plVar7[0xd] != (undefined8 *)0x0) {
      (**(code **)plVar7[0xd])(plVar7 + 0xd,0);
    }
    if (puStack_68 == (undefined8 *)0x0) {
      plVar7[0xd] = 0;
    }
    else if ((code *)puStack_68[3] == (code *)&UNK_142791d20) {
      func_0x0001427923c0(plVar7 + 0xd,auStack_88 + (_DAT_14b9e3f64 + 0xf4b30028));
    }
    else {
      (*(code *)puStack_68[3])(&puStack_68,plVar7 + 0xd);
    }
    *(undefined1 *)(plVar7 + 0x12) = uVar3;
    *(bool *)((longlong)plVar7 + 0x92) = (byte)(*(char *)((longlong)plVar7 + 0x91) - 2U) < 2;
    *(undefined1 *)((longlong)plVar7 + 0x93) = 0;
    FUN_14280a730(lVar4 + 0x20);
    plVar1 = (longlong *)(lVar4 + (ulonglong)(_DAT_14a919e00 + 0xb8000058));
    lVar6 = *plVar1;
    *plVar1 = (longlong)plVar7;
    *(longlong **)(lVar6 + 8) = plVar7;
    *plVar7 = lVar6;
    plVar7[1] = (longlong)plVar1;
    *(int *)(lVar4 + 0x50) = *(int *)(lVar4 + 0x50) + 1;
    (*_DAT_1437e5120)(lVar4 + 0x20);
    FUN_142817840(lVar4);
    if ((puStack_68 != (undefined8 *)0x0) && ((code *)*puStack_68 != FUN_1404c3470)) {
      (*(code *)*puStack_68)(&puStack_68,0);
    }
    piVar9 = (int *)(lVar4 + (ulonglong)(_DAT_151ee4e70 ^ 0xc7495149));
    LOCK();
    iVar2 = *piVar9;
    *piVar9 = *piVar9 + -1;
    UNLOCK();
    if (iVar2 + (_DAT_153bae298 ^ 0xb7ffffff) == 0) {
      piVar8 = piVar9 + -2;
      if (piVar9 == (int *)0x0) {
        piVar8 = (int *)0x0;
      }
      if (piVar8 != (int *)0x0) {
        (*(code *)**(undefined8 **)piVar8)(piVar8,1);
      }
    }
  }
  else {
    LOCK();
    *(byte *)(param_3 + 0x20) = (byte)_DAT_14e439e0a ^ 0x4d;
    UNLOCK();
  }
  FUN_143535370(uStack_38 ^ (ulonglong)auStack_88);
  return;
}


