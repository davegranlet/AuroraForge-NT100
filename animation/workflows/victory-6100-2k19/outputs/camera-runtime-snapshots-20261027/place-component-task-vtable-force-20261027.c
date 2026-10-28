
===== requested=142791d20 block=.arch(140001000 - 1437e4fff) =====
FUNCTION FUN_142791d20 @ 142791d20
SIGNATURE undefined FUN_142791d20(void)
CALLERS

void FUN_142791d20(longlong param_1,undefined8 *param_2)

{
  *param_2 = &UNK_144270e80;
  param_2[1] = *(undefined8 *)(param_1 + 8);
  return;
}



===== requested=142791dd0 block=.arch(140001000 - 1437e4fff) =====
FUNCTION thunk_FUN_151e50960 @ 142791dd0
SIGNATURE undefined thunk_FUN_151e50960(void)
CALLERS

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 thunk_FUN_151e50960(longlong param_1)

{
  undefined1 *puVar1;
  undefined1 uVar2;
  undefined8 *puVar3;
  int iVar4;
  
  puVar3 = *(undefined8 **)(param_1 + 8);
  FUN_142790ef0(*puVar3,puVar3[2],puVar3[3]);
  iVar4 = _DAT_1489768bc + 0x50f0b721;
  LOCK();
  puVar1 = (undefined1 *)(*(longlong *)(param_1 + 8) + 0x20);
  uVar2 = *puVar1;
  *puVar1 = (char)iVar4;
  UNLOCK();
  return CONCAT31((int3)((uint)iVar4 >> 8),uVar2);
}



===== requested=142791d10 block=.arch(140001000 - 1437e4fff) =====
FUNCTION FUN_142791d10 @ 142791d10
SIGNATURE undefined FUN_142791d10(void)
CALLERS
from=142790f95 type=UNCONDITIONAL_CALL function=FUN_142790ef0 @ 142790ef0

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_142791d10(longlong param_1,undefined8 *param_2)

{
  char *pcVar1;
  char cVar2;
  ushort uVar3;
  longlong *plVar4;
  int *piVar5;
  uint uVar6;
  undefined8 uVar7;
  longlong lVar8;
  longlong lVar9;
  uint *puVar10;
  uint *puVar11;
  undefined8 *puVar12;
  uint *puVar13;
  char cVar14;
  uint uVar15;
  undefined4 uVar16;
  ushort *puVar17;
  ulonglong uVar18;
  uint uVar19;
  uint *puVar20;
  longlong unaff_GS_OFFSET;
  bool bVar21;
  undefined1 auStack_108 [32];
  undefined8 *puStack_e8;
  undefined8 uStack_d8;
  uint *puStack_d0;
  uint uStack_c8;
  undefined4 uStack_c4;
  uint **ppuStack_c0;
  uint **ppuStack_b8;
  undefined8 uStack_a8;
  uint **ppuStack_a0;
  uint **ppuStack_98;
  uint *puStack_88;
  uint *puStack_80;
  uint *apuStack_78 [2];
  undefined4 uStack_68;
  undefined4 uStack_64;
  undefined8 uStack_60;
  char cStack_58;
  char acStack_57 [15];
  ulonglong uStack_48;
  
  piVar5 = (int *)*param_2;
  puVar13 = (uint *)(param_1 + 8);
  uStack_48 = _DAT_14467a040 ^ (ulonglong)auStack_108;
  puVar17 = (ushort *)((longlong)piVar5 - (longlong)*piVar5);
  puStack_d0 = puVar13;
  puStack_88 = puVar13;
  if ((((0x10 < *puVar17) &&
       (puVar11 = (uint *)((longlong)piVar5 + (ulonglong)puVar17[8]), puVar17[8] != 0)) &&
      ((ulonglong)*puVar11 + (longlong)puVar11 != 0)) &&
     ((*(byte *)((ulonglong)*(uint *)((ulonglong)puVar17[8] + (longlong)piVar5) + 4 +
                (longlong)((ulonglong)puVar17[8] + (longlong)piVar5)) & 1) == 0))
  goto LAB_142791517;
  uVar7 = *(undefined8 *)(*(longlong *)(param_1 + 0x18) + 8);
  lVar8 = **(longlong **)(unaff_GS_OFFSET + 0x58);
  if (*(char *)(lVar8 + 0x7c) == '\0') {
    func_0x0001435358c4();
  }
  puStack_80 = (uint *)FUN_142520ed0(uVar7,*(undefined2 *)(lVar8 + 0x224),0x50,8);
  if (puStack_80 == (uint *)0x0) {
    uVar7 = 0;
  }
  else {
    puVar17 = (ushort *)((longlong)piVar5 - (longlong)*piVar5);
    if ((*puVar17 < 0xd) || (puVar17[6] == 0)) {
      bVar21 = true;
      if (4 < *puVar17) goto LAB_1427911af;
LAB_1427911be:
      uVar16 = 0;
    }
    else {
      bVar21 = *(char *)((ulonglong)puVar17[6] + (longlong)piVar5) != '\0';
LAB_1427911af:
      if (puVar17[2] == 0) goto LAB_1427911be;
      uVar16 = *(undefined4 *)((ulonglong)puVar17[2] + (longlong)piVar5);
    }
    uVar7 = FUN_14278f2f0(puStack_80,*(undefined8 *)(*(longlong *)(param_1 + 0x18) + 8),uVar16,
                          bVar21);
  }
  puVar17 = (ushort *)((longlong)piVar5 - (longlong)*piVar5);
  uStack_d8 = uVar7;
  if (((10 < *puVar17) &&
      (puVar11 = (uint *)((longlong)piVar5 + (ulonglong)puVar17[5]), puVar17[5] != 0)) &&
     ((ulonglong)*puVar11 + (longlong)puVar11 != 0)) {
    puVar10 = (uint *)((ulonglong)*(uint *)((ulonglong)puVar17[5] + (longlong)piVar5) +
                      (longlong)((ulonglong)puVar17[5] + (longlong)piVar5));
    puVar11 = puVar10 + (ulonglong)*puVar10 + 1;
    puVar20 = puStack_88;
joined_r0x00014279122c:
    puVar10 = puVar10 + 1;
    puStack_88 = puVar20;
    if (puVar10 != puVar11) {
      puStack_88 = (uint *)((ulonglong)*puVar10 + (longlong)puVar10);
      if ((*(ushort *)((longlong)puStack_88 - (longlong)(int)*puStack_88) < 7) ||
         (uVar3 = ((ushort *)((longlong)puStack_88 - (longlong)(int)*puStack_88))[3], uVar3 == 0)) {
        uVar18 = 0;
      }
      else {
        uVar18 = (ulonglong)*(ushort *)((ulonglong)uVar3 + (longlong)puStack_88);
      }
      lVar8 = *(longlong *)(*(longlong *)(param_1 + 0x18) + 0x68);
      while (puStack_80 = puStack_88, lVar8 != *(longlong *)(param_1 + 0x18) + 0xd0) {
        if (*(ushort *)(lVar8 + 0x18) == uVar18) {
          apuStack_78[0] =
               (uint *)(**(code **)(*(longlong *)(lVar8 + 0x20) + 8))
                                 ((longlong *)(lVar8 + 0x20),&puStack_88);
          puVar20 = puStack_88;
          if (apuStack_78[0] != (uint *)0x0) {
            plVar4 = *(longlong **)(param_1 + 0x10);
            uVar19 = *(uint *)((longlong)plVar4 + 0x14);
            uVar15 = uVar19 + 1;
            uVar6 = *(uint *)(plVar4 + 2);
            if (uVar6 < uVar15) {
              uVar6 = uVar6 + (uVar6 >> 1);
              if (uVar15 <= uVar6) {
                uVar15 = uVar6;
              }
              ppuStack_c0 = apuStack_78;
              ppuStack_b8 = &puStack_80;
              uStack_a8 = CONCAT44(uStack_c4,uVar19);
              puStack_e8 = &uStack_a8;
              uStack_c8 = uVar19;
              ppuStack_a0 = ppuStack_c0;
              ppuStack_98 = ppuStack_b8;
              func_0x000141e84230(plVar4,uVar15);
              FUN_14278f010(uVar7,apuStack_78[0]);
              puVar20 = puStack_88;
            }
            else {
              if (uVar19 < uVar6) {
                puVar12 = (undefined8 *)((ulonglong)uVar19 * 0x10 + *plVar4);
                *puVar12 = apuStack_78[0];
                puVar12[1] = puStack_80;
                *(int *)((longlong)plVar4 + 0x14) = *(int *)((longlong)plVar4 + 0x14) + 1;
              }
              FUN_14278f010(uVar7,apuStack_78[0]);
              puVar20 = puStack_88;
            }
          }
          goto joined_r0x00014279122c;
        }
        if ((longlong)(*(ushort *)(lVar8 + 0x18) - uVar18) < 1) {
          lVar8 = *(longlong *)(lVar8 + 0x10);
        }
        else {
          lVar8 = *(longlong *)(lVar8 + 8);
        }
      }
      apuStack_78[0] = (uint *)0x0;
      goto joined_r0x00014279122c;
    }
  }
  puVar17 = (ushort *)((longlong)piVar5 - (longlong)*piVar5);
  if (((8 < *puVar17) &&
      (puVar11 = (uint *)((longlong)piVar5 + (ulonglong)puVar17[4]), puVar17[4] != 0)) &&
     ((ulonglong)*puVar11 + (longlong)puVar11 != 0)) {
    puVar11 = (uint *)((ulonglong)*(uint *)((ulonglong)puVar17[4] + (longlong)piVar5) +
                      (longlong)((ulonglong)puVar17[4] + (longlong)piVar5));
    puStack_80 = puVar11 + 1;
    puVar11 = puVar11 + (ulonglong)*puVar11 + 1;
    apuStack_78[0] = puVar11;
    if (puStack_80 != puVar11) {
      do {
        puVar10 = puStack_80;
        puVar20 = (uint *)((ulonglong)*puStack_80 + (longlong)puStack_80);
        puStack_88 = puVar20;
        lVar8 = (**(code **)(**(longlong **)puVar13 + 8))(*(longlong **)puVar13,&puStack_88);
        uVar7 = uStack_d8;
        if (lVar8 != 0) {
          FUN_14278f920(uStack_d8,lVar8);
          puVar13 = puStack_d0;
          uVar19 = 1;
          while( true ) {
            if ((*(ushort *)((longlong)puVar20 - (longlong)(int)*puVar20) < 0xf) ||
               (uVar3 = ((ushort *)((longlong)puVar20 - (longlong)(int)*puVar20))[7], uVar3 == 0)) {
              uVar6 = 0;
            }
            else {
              uVar6 = *(uint *)((ulonglong)uVar3 + (longlong)puVar20);
            }
            if (uVar6 < uVar19) break;
            puStack_88 = puVar20;
            lVar9 = (**(code **)(**(longlong **)puVar13 + 8))(*(longlong **)puVar13,&puStack_88);
            if (lVar9 != 0) {
              *(longlong *)(lVar9 + 0x10) = lVar8;
              *(short *)(lVar9 + 0x4c) = (short)uVar19;
              uStack_60 = 0;
              uStack_68 = 0x80000010;
              uStack_64 = 0;
              cStack_58 = '\0';
              FUN_1427fad90(&uStack_68,&UNK_144270e70,uVar19);
              pcVar1 = &cStack_58;
              uVar6 = ~*(uint *)(lVar9 + 0x48);
              cVar2 = cStack_58;
              while (cVar2 != '\0') {
                pcVar1 = pcVar1 + 1;
                cVar14 = cVar2 + ' ';
                if (0x19 < (byte)(cVar2 + 0xbfU)) {
                  cVar14 = cVar2;
                }
                uVar6 = crc32(uVar6,cVar14);
                cVar2 = *pcVar1;
              }
              *(uint *)(lVar9 + 0x48) = ~uVar6;
              FUN_14278f920(uVar7,lVar9);
            }
            uVar19 = uVar19 + 1;
          }
          puVar10 = puStack_80;
          puVar11 = apuStack_78[0];
          puVar13 = puStack_d0;
        }
        puStack_80 = puVar10 + 1;
      } while (puStack_80 != puVar11);
    }
  }
LAB_142791517:
  FUN_143535370(uStack_48 ^ (ulonglong)auStack_108);
  return;
}



===== requested=142791c50 block=.arch(140001000 - 1437e4fff) =====
FUNCTION FUN_142791c50 @ 142791c50
SIGNATURE undefined FUN_142791c50(void)
CALLERS

void FUN_142791c50(longlong param_1,undefined8 *param_2)

{
  undefined8 uVar1;
  
  *param_2 = &UNK_144270eb0;
  uVar1 = *(undefined8 *)(param_1 + 0x10);
  param_2[1] = *(undefined8 *)(param_1 + 8);
  param_2[2] = uVar1;
  param_2[3] = *(undefined8 *)(param_1 + 0x18);
  return;
}


