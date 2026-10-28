
===== requested=151e2d3e0 block=.xcode(1452a2000 - 158380fff) =====
FUNCTION FUN_151e2d3e0 @ 151e2d3e0
SIGNATURE undefined FUN_151e2d3e0(void)
CALLERS
from=15883af78 type=DATA function=<data>

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_151e2d3e0(longlong param_1,longlong param_2)

{
  uint uVar1;
  undefined8 uVar2;
  longlong lVar3;
  char cVar4;
  undefined1 uVar5;
  longlong lVar6;
  longlong *plVar7;
  longlong *plVar8;
  uint uVar9;
  uint uVar10;
  longlong unaff_GS_OFFSET;
  undefined1 auStack_e8 [32];
  longlong **pplStack_c8;
  longlong *plStack_b8;
  longlong **pplStack_b0;
  longlong lStack_a8;
  undefined1 uStack_a0;
  undefined *puStack_98;
  undefined8 uStack_90;
  undefined *puStack_88;
  undefined8 uStack_80;
  longlong *plStack_78;
  undefined8 uStack_70;
  undefined8 uStack_68;
  undefined8 uStack_60;
  undefined8 uStack_58;
  undefined2 uStack_50;
  longlong *aplStack_48 [2];
  ulonglong uStack_38;
  
  uStack_38 = _DAT_14467a040 ^ (ulonglong)auStack_e8;
  lStack_a8 = param_1;
  cVar4 = FUN_142813a60(param_2);
  if (cVar4 != '\0') {
    uVar2 = *(undefined8 *)(param_1 + 8);
    lVar3 = **(longlong **)(unaff_GS_OFFSET + 0x58);
    if (*(char *)(lVar3 + 0x7c) == '\0') {
      func_0x0001435358c4();
    }
    lVar6 = FUN_142520ed0(uVar2,*(undefined2 *)(lVar3 + 0x224),_DAT_1492a54a4 ^ 0x419cf7d9,
                          -0x50f0b3f8 - _DAT_150fe5584);
    if (lVar6 == 0) {
      lVar6 = 0;
    }
    else {
      func_0x0001413eb950(lVar6,*(undefined8 *)(param_1 + 8));
      *(undefined8 *)(lVar6 + 0x30) = 0;
      *(undefined8 *)(lVar6 + 0x38) = 0;
      *(undefined8 *)(lVar6 + 0x40) = 0;
      *(undefined1 *)(lVar6 + 0x48) = 0;
    }
    uVar2 = *(undefined8 *)(param_1 + 8);
    if (*(char *)(lVar3 + 0x7c) == '\0') {
      func_0x0001435358c4();
    }
    plVar7 = (longlong *)
             FUN_142520ed0(uVar2,*(undefined2 *)(lVar3 + 0x224),_DAT_1493a4efc ^ 0xffbc0f6d,8);
    plStack_b8 = plVar7;
    if (plVar7 == (longlong *)0x0) {
      plVar7 = (longlong *)0x0;
    }
    else {
      *plVar7 = param_1;
      plVar7[1] = param_2;
      plVar7[2] = lVar6;
      plVar7[3] = 0;
      *(undefined2 *)(plVar7 + 4) = 0;
      *(undefined1 *)((longlong)plVar7 + 0x22) = 0;
      uStack_90 = *(undefined8 *)((ulonglong)(_DAT_152e870bc ^ 0x6caf0ea8) + lVar3);
      uStack_80 = 0;
      uStack_70 = 0;
      uStack_68 = 0;
      uStack_60 = 0;
      uStack_58 = 0;
      if (*(char *)(lVar3 + 0x7c) == '\0') {
        func_0x0001435358c4();
      }
      uStack_50 = *(undefined2 *)(lVar3 + 0x224);
      puStack_98 = &DAT_144d03730;
      puStack_88 = &UNK_14278ff40;
      plStack_78 = plVar7;
      uVar5 = FUN_1427f93a0(param_2,&puStack_98);
      *(undefined1 *)((longlong)plVar7 + 0x22) = uVar5;
    }
    aplStack_48[0] = plVar7;
    if (*(char *)((longlong)plVar7 + 0x22) == '\0') {
      plVar8 = (longlong *)FUN_1427ec6a0(plVar7);
      (**(code **)(*plVar8 + 0xa0))(plVar8,plVar7);
      aplStack_48[0] = (longlong *)0x0;
      LOCK();
      _DAT_144d7ca5c = _DAT_144d7ca5c + 1;
      UNLOCK();
      LOCK();
      _DAT_144d7ba18 = _DAT_144d7ba18 + 1;
      UNLOCK();
      if (*(longlong *)(lVar6 + 0x40) != 0) {
        FUN_14278f470();
      }
      if (*(longlong *)(lVar6 + 0x40) != 0) {
        FUN_14278f4f0(*(longlong *)(lVar6 + 0x40),param_1 + 0x60);
      }
      FUN_142790590(lVar6);
      LOCK();
      _DAT_144d7ba18 = _DAT_144d7ba18 + -1;
      UNLOCK();
      LOCK();
      _DAT_144d7ca5c = _DAT_144d7ca5c + -1;
      UNLOCK();
    }
    else {
      lVar3 = param_1 + 0x10;
      uStack_a0 = 0;
      lStack_a8 = lVar3;
      FUN_14280a8a0(lVar3);
      uVar1 = *(uint *)(param_1 + 0x2c);
      uVar9 = uVar1 + 1;
      uVar10 = *(uint *)(param_1 + 0x28);
      if (uVar10 < uVar9) {
        uVar10 = uVar10 + (uVar10 >> 1);
        if (uVar9 <= uVar10) {
          uVar9 = uVar10;
        }
        plStack_b8 = (longlong *)CONCAT44(plStack_b8._4_4_,uVar1);
        pplStack_b0 = aplStack_48;
        pplStack_c8 = &plStack_b8;
        FUN_1404d1730(param_1 + 0x18,uVar9,uVar10,uVar1);
      }
      else if (uVar1 < uVar10) {
        *(longlong **)(*(longlong *)(param_1 + 0x18) + (ulonglong)uVar1 * 8) = aplStack_48[0];
        *(int *)(param_1 + 0x2c) = *(int *)(param_1 + 0x2c) + 1;
      }
      (*_DAT_1437e52a0)(lVar3);
    }
  }
  FUN_143535370(uStack_38 ^ (ulonglong)auStack_e8);
  return;
}


