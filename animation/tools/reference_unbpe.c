/* Independent validation harness for the public Yukes BPE decoder.
 * Core algorithm: Luigi Auriemma, reversed from asmodean's unrrbpe.exe.
 */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int xgetc(unsigned char **in, unsigned char *end) {
    if (*in >= end) return -1;
    return *(*in)++;
}

static int yuke_bpe(unsigned char *in, int insz, unsigned char *out,
                    int outsz, int fill_outsz) {
    unsigned char stack[512 + 4096];
    int c, count = 0, i, size, n;
    unsigned char *end = in + insz, *o = out, *out_end = out + outsz;
    for (;;) {
        i = 0;
        do {
            if ((c = xgetc(&in, end)) < 0) break;
            if (c > 127) {
                c -= 127;
                while (c > 0 && i < 256) {
                    stack[i * 2] = (unsigned char)i;
                    --c; ++i;
                }
            }
            ++c;
            while (c > 0 && i < 256) {
                if ((n = xgetc(&in, end)) < 0) break;
                stack[i * 2] = (unsigned char)n;
                if (i != n) {
                    if ((n = xgetc(&in, end)) < 0) break;
                    stack[i * 2 + 1] = (unsigned char)n;
                }
                --c; ++i;
            }
        } while (i < 256);
        if ((n = xgetc(&in, end)) < 0) break;
        size = n;
        if ((n = xgetc(&in, end)) < 0) break;
        size |= n << 8;
        while (size || count) {
            if (count) n = stack[--count + 512];
            else {
                if ((n = xgetc(&in, end)) < 0) break;
                --size;
            }
            c = stack[n * 2];
            if (n == c) {
                if (o >= out_end) return -1;
                *o++ = (unsigned char)n;
            } else {
                if (count + 514 > (int)sizeof(stack)) return -1;
                stack[count + 512] = stack[n * 2 + 1];
                stack[count + 513] = (unsigned char)c;
                count += 2;
            }
        }
    }
    if (fill_outsz) {
        memset(o, 0, (size_t)(out_end - o));
        o = out_end;
    }
    return (int)(o - out);
}

static uint32_t le32(const unsigned char *p) {
    return (uint32_t)p[0] | (uint32_t)p[1] << 8 |
           (uint32_t)p[2] << 16 | (uint32_t)p[3] << 24;
}

int main(int argc, char **argv) {
    if (argc != 3) return 2;
    FILE *f = fopen(argv[1], "rb");
    if (!f) return 3;
    fseek(f, 0, SEEK_END); long length = ftell(f); rewind(f);
    unsigned char *input = malloc((size_t)length);
    fread(input, 1, (size_t)length, f); fclose(f);
    if (length < 16 || memcmp(input, "BPE ", 4)) return 4;
    uint32_t packed = le32(input + 8), unpacked = le32(input + 12);
    unsigned char *output = malloc(unpacked);
    int written = yuke_bpe(input + 16, (int)packed, output, (int)unpacked, 1);
    if (written != (int)unpacked) return 5;
    f = fopen(argv[2], "wb");
    if (!f) return 6;
    fwrite(output, 1, unpacked, f); fclose(f);
    free(input); free(output);
    return 0;
}
