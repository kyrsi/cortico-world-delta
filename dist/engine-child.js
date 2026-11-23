var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/jpeg-js/lib/encoder.js
var require_encoder = __commonJS({
  "node_modules/jpeg-js/lib/encoder.js"(exports, module) {
    var btoa = btoa || function(buf) {
      return Buffer.from(buf).toString("base64");
    };
    function JPEGEncoder(quality) {
      var self = this;
      var fround = Math.round;
      var ffloor = Math.floor;
      var YTable = new Array(64);
      var UVTable = new Array(64);
      var fdtbl_Y = new Array(64);
      var fdtbl_UV = new Array(64);
      var YDC_HT;
      var UVDC_HT;
      var YAC_HT;
      var UVAC_HT;
      var bitcode = new Array(65535);
      var category = new Array(65535);
      var outputfDCTQuant = new Array(64);
      var DU = new Array(64);
      var byteout = [];
      var bytenew = 0;
      var bytepos = 7;
      var YDU = new Array(64);
      var UDU = new Array(64);
      var VDU = new Array(64);
      var clt = new Array(256);
      var RGB_YUV_TABLE = new Array(2048);
      var currentQuality;
      var ZigZag = [
        0,
        1,
        5,
        6,
        14,
        15,
        27,
        28,
        2,
        4,
        7,
        13,
        16,
        26,
        29,
        42,
        3,
        8,
        12,
        17,
        25,
        30,
        41,
        43,
        9,
        11,
        18,
        24,
        31,
        40,
        44,
        53,
        10,
        19,
        23,
        32,
        39,
        45,
        52,
        54,
        20,
        22,
        33,
        38,
        46,
        51,
        55,
        60,
        21,
        34,
        37,
        47,
        50,
        56,
        59,
        61,
        35,
        36,
        48,
        49,
        57,
        58,
        62,
        63
      ];
      var std_dc_luminance_nrcodes = [0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
      var std_dc_luminance_values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      var std_ac_luminance_nrcodes = [0, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125];
      var std_ac_luminance_values = [
        1,
        2,
        3,
        0,
        4,
        17,
        5,
        18,
        33,
        49,
        65,
        6,
        19,
        81,
        97,
        7,
        34,
        113,
        20,
        50,
        129,
        145,
        161,
        8,
        35,
        66,
        177,
        193,
        21,
        82,
        209,
        240,
        36,
        51,
        98,
        114,
        130,
        9,
        10,
        22,
        23,
        24,
        25,
        26,
        37,
        38,
        39,
        40,
        41,
        42,
        52,
        53,
        54,
        55,
        56,
        57,
        58,
        67,
        68,
        69,
        70,
        71,
        72,
        73,
        74,
        83,
        84,
        85,
        86,
        87,
        88,
        89,
        90,
        99,
        100,
        101,
        102,
        103,
        104,
        105,
        106,
        115,
        116,
        117,
        118,
        119,
        120,
        121,
        122,
        131,
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        146,
        147,
        148,
        149,
        150,
        151,
        152,
        153,
        154,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        178,
        179,
        180,
        181,
        182,
        183,
        184,
        185,
        186,
        194,
        195,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        225,
        226,
        227,
        228,
        229,
        230,
        231,
        232,
        233,
        234,
        241,
        242,
        243,
        244,
        245,
        246,
        247,
        248,
        249,
        250
      ];
      var std_dc_chrominance_nrcodes = [0, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
      var std_dc_chrominance_values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      var std_ac_chrominance_nrcodes = [0, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119];
      var std_ac_chrominance_values = [
        0,
        1,
        2,
        3,
        17,
        4,
        5,
        33,
        49,
        6,
        18,
        65,
        81,
        7,
        97,
        113,
        19,
        34,
        50,
        129,
        8,
        20,
        66,
        145,
        161,
        177,
        193,
        9,
        35,
        51,
        82,
        240,
        21,
        98,
        114,
        209,
        10,
        22,
        36,
        52,
        225,
        37,
        241,
        23,
        24,
        25,
        26,
        38,
        39,
        40,
        41,
        42,
        53,
        54,
        55,
        56,
        57,
        58,
        67,
        68,
        69,
        70,
        71,
        72,
        73,
        74,
        83,
        84,
        85,
        86,
        87,
        88,
        89,
        90,
        99,
        100,
        101,
        102,
        103,
        104,
        105,
        106,
        115,
        116,
        117,
        118,
        119,
        120,
        121,
        122,
        130,
        131,
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        146,
        147,
        148,
        149,
        150,
        151,
        152,
        153,
        154,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        178,
        179,
        180,
        181,
        182,
        183,
        184,
        185,
        186,
        194,
        195,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        226,
        227,
        228,
        229,
        230,
        231,
        232,
        233,
        234,
        242,
        243,
        244,
        245,
        246,
        247,
        248,
        249,
        250
      ];
      function initQuantTables(sf) {
        var YQT = [
          16,
          11,
          10,
          16,
          24,
          40,
          51,
          61,
          12,
          12,
          14,
          19,
          26,
          58,
          60,
          55,
          14,
          13,
          16,
          24,
          40,
          57,
          69,
          56,
          14,
          17,
          22,
          29,
          51,
          87,
          80,
          62,
          18,
          22,
          37,
          56,
          68,
          109,
          103,
          77,
          24,
          35,
          55,
          64,
          81,
          104,
          113,
          92,
          49,
          64,
          78,
          87,
          103,
          121,
          120,
          101,
          72,
          92,
          95,
          98,
          112,
          100,
          103,
          99
        ];
        for (var i = 0; i < 64; i++) {
          var t = ffloor((YQT[i] * sf + 50) / 100);
          if (t < 1) {
            t = 1;
          } else if (t > 255) {
            t = 255;
          }
          YTable[ZigZag[i]] = t;
        }
        var UVQT = [
          17,
          18,
          24,
          47,
          99,
          99,
          99,
          99,
          18,
          21,
          26,
          66,
          99,
          99,
          99,
          99,
          24,
          26,
          56,
          99,
          99,
          99,
          99,
          99,
          47,
          66,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99
        ];
        for (var j = 0; j < 64; j++) {
          var u = ffloor((UVQT[j] * sf + 50) / 100);
          if (u < 1) {
            u = 1;
          } else if (u > 255) {
            u = 255;
          }
          UVTable[ZigZag[j]] = u;
        }
        var aasf = [
          1,
          1.387039845,
          1.306562965,
          1.175875602,
          1,
          0.785694958,
          0.5411961,
          0.275899379
        ];
        var k = 0;
        for (var row = 0; row < 8; row++) {
          for (var col = 0; col < 8; col++) {
            fdtbl_Y[k] = 1 / (YTable[ZigZag[k]] * aasf[row] * aasf[col] * 8);
            fdtbl_UV[k] = 1 / (UVTable[ZigZag[k]] * aasf[row] * aasf[col] * 8);
            k++;
          }
        }
      }
      function computeHuffmanTbl(nrcodes, std_table) {
        var codevalue = 0;
        var pos_in_table = 0;
        var HT = new Array();
        for (var k = 1; k <= 16; k++) {
          for (var j = 1; j <= nrcodes[k]; j++) {
            HT[std_table[pos_in_table]] = [];
            HT[std_table[pos_in_table]][0] = codevalue;
            HT[std_table[pos_in_table]][1] = k;
            pos_in_table++;
            codevalue++;
          }
          codevalue *= 2;
        }
        return HT;
      }
      function initHuffmanTbl() {
        YDC_HT = computeHuffmanTbl(std_dc_luminance_nrcodes, std_dc_luminance_values);
        UVDC_HT = computeHuffmanTbl(std_dc_chrominance_nrcodes, std_dc_chrominance_values);
        YAC_HT = computeHuffmanTbl(std_ac_luminance_nrcodes, std_ac_luminance_values);
        UVAC_HT = computeHuffmanTbl(std_ac_chrominance_nrcodes, std_ac_chrominance_values);
      }
      function initCategoryNumber() {
        var nrlower = 1;
        var nrupper = 2;
        for (var cat = 1; cat <= 15; cat++) {
          for (var nr = nrlower; nr < nrupper; nr++) {
            category[32767 + nr] = cat;
            bitcode[32767 + nr] = [];
            bitcode[32767 + nr][1] = cat;
            bitcode[32767 + nr][0] = nr;
          }
          for (var nrneg = -(nrupper - 1); nrneg <= -nrlower; nrneg++) {
            category[32767 + nrneg] = cat;
            bitcode[32767 + nrneg] = [];
            bitcode[32767 + nrneg][1] = cat;
            bitcode[32767 + nrneg][0] = nrupper - 1 + nrneg;
          }
          nrlower <<= 1;
          nrupper <<= 1;
        }
      }
      function initRGBYUVTable() {
        for (var i = 0; i < 256; i++) {
          RGB_YUV_TABLE[i] = 19595 * i;
          RGB_YUV_TABLE[i + 256 >> 0] = 38470 * i;
          RGB_YUV_TABLE[i + 512 >> 0] = 7471 * i + 32768;
          RGB_YUV_TABLE[i + 768 >> 0] = -11059 * i;
          RGB_YUV_TABLE[i + 1024 >> 0] = -21709 * i;
          RGB_YUV_TABLE[i + 1280 >> 0] = 32768 * i + 8421375;
          RGB_YUV_TABLE[i + 1536 >> 0] = -27439 * i;
          RGB_YUV_TABLE[i + 1792 >> 0] = -5329 * i;
        }
      }
      function writeBits(bs) {
        var value = bs[0];
        var posval = bs[1] - 1;
        while (posval >= 0) {
          if (value & 1 << posval) {
            bytenew |= 1 << bytepos;
          }
          posval--;
          bytepos--;
          if (bytepos < 0) {
            if (bytenew == 255) {
              writeByte(255);
              writeByte(0);
            } else {
              writeByte(bytenew);
            }
            bytepos = 7;
            bytenew = 0;
          }
        }
      }
      function writeByte(value) {
        byteout.push(value);
      }
      function writeWord(value) {
        writeByte(value >> 8 & 255);
        writeByte(value & 255);
      }
      function fDCTQuant(data, fdtbl) {
        var d0, d1, d2, d3, d4, d5, d6, d7;
        var dataOff = 0;
        var i;
        var I8 = 8;
        var I64 = 64;
        for (i = 0; i < I8; ++i) {
          d0 = data[dataOff];
          d1 = data[dataOff + 1];
          d2 = data[dataOff + 2];
          d3 = data[dataOff + 3];
          d4 = data[dataOff + 4];
          d5 = data[dataOff + 5];
          d6 = data[dataOff + 6];
          d7 = data[dataOff + 7];
          var tmp0 = d0 + d7;
          var tmp7 = d0 - d7;
          var tmp1 = d1 + d6;
          var tmp6 = d1 - d6;
          var tmp2 = d2 + d5;
          var tmp5 = d2 - d5;
          var tmp3 = d3 + d4;
          var tmp4 = d3 - d4;
          var tmp10 = tmp0 + tmp3;
          var tmp13 = tmp0 - tmp3;
          var tmp11 = tmp1 + tmp2;
          var tmp12 = tmp1 - tmp2;
          data[dataOff] = tmp10 + tmp11;
          data[dataOff + 4] = tmp10 - tmp11;
          var z1 = (tmp12 + tmp13) * 0.707106781;
          data[dataOff + 2] = tmp13 + z1;
          data[dataOff + 6] = tmp13 - z1;
          tmp10 = tmp4 + tmp5;
          tmp11 = tmp5 + tmp6;
          tmp12 = tmp6 + tmp7;
          var z5 = (tmp10 - tmp12) * 0.382683433;
          var z2 = 0.5411961 * tmp10 + z5;
          var z4 = 1.306562965 * tmp12 + z5;
          var z3 = tmp11 * 0.707106781;
          var z11 = tmp7 + z3;
          var z13 = tmp7 - z3;
          data[dataOff + 5] = z13 + z2;
          data[dataOff + 3] = z13 - z2;
          data[dataOff + 1] = z11 + z4;
          data[dataOff + 7] = z11 - z4;
          dataOff += 8;
        }
        dataOff = 0;
        for (i = 0; i < I8; ++i) {
          d0 = data[dataOff];
          d1 = data[dataOff + 8];
          d2 = data[dataOff + 16];
          d3 = data[dataOff + 24];
          d4 = data[dataOff + 32];
          d5 = data[dataOff + 40];
          d6 = data[dataOff + 48];
          d7 = data[dataOff + 56];
          var tmp0p2 = d0 + d7;
          var tmp7p2 = d0 - d7;
          var tmp1p2 = d1 + d6;
          var tmp6p2 = d1 - d6;
          var tmp2p2 = d2 + d5;
          var tmp5p2 = d2 - d5;
          var tmp3p2 = d3 + d4;
          var tmp4p2 = d3 - d4;
          var tmp10p2 = tmp0p2 + tmp3p2;
          var tmp13p2 = tmp0p2 - tmp3p2;
          var tmp11p2 = tmp1p2 + tmp2p2;
          var tmp12p2 = tmp1p2 - tmp2p2;
          data[dataOff] = tmp10p2 + tmp11p2;
          data[dataOff + 32] = tmp10p2 - tmp11p2;
          var z1p2 = (tmp12p2 + tmp13p2) * 0.707106781;
          data[dataOff + 16] = tmp13p2 + z1p2;
          data[dataOff + 48] = tmp13p2 - z1p2;
          tmp10p2 = tmp4p2 + tmp5p2;
          tmp11p2 = tmp5p2 + tmp6p2;
          tmp12p2 = tmp6p2 + tmp7p2;
          var z5p2 = (tmp10p2 - tmp12p2) * 0.382683433;
          var z2p2 = 0.5411961 * tmp10p2 + z5p2;
          var z4p2 = 1.306562965 * tmp12p2 + z5p2;
          var z3p2 = tmp11p2 * 0.707106781;
          var z11p2 = tmp7p2 + z3p2;
          var z13p2 = tmp7p2 - z3p2;
          data[dataOff + 40] = z13p2 + z2p2;
          data[dataOff + 24] = z13p2 - z2p2;
          data[dataOff + 8] = z11p2 + z4p2;
          data[dataOff + 56] = z11p2 - z4p2;
          dataOff++;
        }
        var fDCTQuant2;
        for (i = 0; i < I64; ++i) {
          fDCTQuant2 = data[i] * fdtbl[i];
          outputfDCTQuant[i] = fDCTQuant2 > 0 ? fDCTQuant2 + 0.5 | 0 : fDCTQuant2 - 0.5 | 0;
        }
        return outputfDCTQuant;
      }
      function writeAPP0() {
        writeWord(65504);
        writeWord(16);
        writeByte(74);
        writeByte(70);
        writeByte(73);
        writeByte(70);
        writeByte(0);
        writeByte(1);
        writeByte(1);
        writeByte(0);
        writeWord(1);
        writeWord(1);
        writeByte(0);
        writeByte(0);
      }
      function writeAPP1(exifBuffer) {
        if (!exifBuffer) return;
        writeWord(65505);
        if (exifBuffer[0] === 69 && exifBuffer[1] === 120 && exifBuffer[2] === 105 && exifBuffer[3] === 102) {
          writeWord(exifBuffer.length + 2);
        } else {
          writeWord(exifBuffer.length + 5 + 2);
          writeByte(69);
          writeByte(120);
          writeByte(105);
          writeByte(102);
          writeByte(0);
        }
        for (var i = 0; i < exifBuffer.length; i++) {
          writeByte(exifBuffer[i]);
        }
      }
      function writeSOF0(width, height) {
        writeWord(65472);
        writeWord(17);
        writeByte(8);
        writeWord(height);
        writeWord(width);
        writeByte(3);
        writeByte(1);
        writeByte(17);
        writeByte(0);
        writeByte(2);
        writeByte(17);
        writeByte(1);
        writeByte(3);
        writeByte(17);
        writeByte(1);
      }
      function writeDQT() {
        writeWord(65499);
        writeWord(132);
        writeByte(0);
        for (var i = 0; i < 64; i++) {
          writeByte(YTable[i]);
        }
        writeByte(1);
        for (var j = 0; j < 64; j++) {
          writeByte(UVTable[j]);
        }
      }
      function writeDHT() {
        writeWord(65476);
        writeWord(418);
        writeByte(0);
        for (var i = 0; i < 16; i++) {
          writeByte(std_dc_luminance_nrcodes[i + 1]);
        }
        for (var j = 0; j <= 11; j++) {
          writeByte(std_dc_luminance_values[j]);
        }
        writeByte(16);
        for (var k = 0; k < 16; k++) {
          writeByte(std_ac_luminance_nrcodes[k + 1]);
        }
        for (var l = 0; l <= 161; l++) {
          writeByte(std_ac_luminance_values[l]);
        }
        writeByte(1);
        for (var m = 0; m < 16; m++) {
          writeByte(std_dc_chrominance_nrcodes[m + 1]);
        }
        for (var n = 0; n <= 11; n++) {
          writeByte(std_dc_chrominance_values[n]);
        }
        writeByte(17);
        for (var o = 0; o < 16; o++) {
          writeByte(std_ac_chrominance_nrcodes[o + 1]);
        }
        for (var p = 0; p <= 161; p++) {
          writeByte(std_ac_chrominance_values[p]);
        }
      }
      function writeCOM(comments) {
        if (typeof comments === "undefined" || comments.constructor !== Array) return;
        comments.forEach((e) => {
          if (typeof e !== "string") return;
          writeWord(65534);
          var l = e.length;
          writeWord(l + 2);
          var i;
          for (i = 0; i < l; i++)
            writeByte(e.charCodeAt(i));
        });
      }
      function writeSOS() {
        writeWord(65498);
        writeWord(12);
        writeByte(3);
        writeByte(1);
        writeByte(0);
        writeByte(2);
        writeByte(17);
        writeByte(3);
        writeByte(17);
        writeByte(0);
        writeByte(63);
        writeByte(0);
      }
      function processDU(CDU, fdtbl, DC, HTDC, HTAC) {
        var EOB = HTAC[0];
        var M16zeroes = HTAC[240];
        var pos;
        var I16 = 16;
        var I63 = 63;
        var I64 = 64;
        var DU_DCT = fDCTQuant(CDU, fdtbl);
        for (var j = 0; j < I64; ++j) {
          DU[ZigZag[j]] = DU_DCT[j];
        }
        var Diff = DU[0] - DC;
        DC = DU[0];
        if (Diff == 0) {
          writeBits(HTDC[0]);
        } else {
          pos = 32767 + Diff;
          writeBits(HTDC[category[pos]]);
          writeBits(bitcode[pos]);
        }
        var end0pos = 63;
        for (; end0pos > 0 && DU[end0pos] == 0; end0pos--) {
        }
        ;
        if (end0pos == 0) {
          writeBits(EOB);
          return DC;
        }
        var i = 1;
        var lng;
        while (i <= end0pos) {
          var startpos = i;
          for (; DU[i] == 0 && i <= end0pos; ++i) {
          }
          var nrzeroes = i - startpos;
          if (nrzeroes >= I16) {
            lng = nrzeroes >> 4;
            for (var nrmarker = 1; nrmarker <= lng; ++nrmarker)
              writeBits(M16zeroes);
            nrzeroes = nrzeroes & 15;
          }
          pos = 32767 + DU[i];
          writeBits(HTAC[(nrzeroes << 4) + category[pos]]);
          writeBits(bitcode[pos]);
          i++;
        }
        if (end0pos != I63) {
          writeBits(EOB);
        }
        return DC;
      }
      function initCharLookupTable() {
        var sfcc = String.fromCharCode;
        for (var i = 0; i < 256; i++) {
          clt[i] = sfcc(i);
        }
      }
      this.encode = function(image, quality2) {
        var time_start = (/* @__PURE__ */ new Date()).getTime();
        if (quality2) setQuality(quality2);
        byteout = new Array();
        bytenew = 0;
        bytepos = 7;
        writeWord(65496);
        writeAPP0();
        writeCOM(image.comments);
        writeAPP1(image.exifBuffer);
        writeDQT();
        writeSOF0(image.width, image.height);
        writeDHT();
        writeSOS();
        var DCY = 0;
        var DCU = 0;
        var DCV = 0;
        bytenew = 0;
        bytepos = 7;
        this.encode.displayName = "_encode_";
        var imageData = image.data;
        var width = image.width;
        var height = image.height;
        var quadWidth = width * 4;
        var tripleWidth = width * 3;
        var x, y = 0;
        var r, g, b;
        var start2, p, col, row, pos;
        while (y < height) {
          x = 0;
          while (x < quadWidth) {
            start2 = quadWidth * y + x;
            p = start2;
            col = -1;
            row = 0;
            for (pos = 0; pos < 64; pos++) {
              row = pos >> 3;
              col = (pos & 7) * 4;
              p = start2 + row * quadWidth + col;
              if (y + row >= height) {
                p -= quadWidth * (y + 1 + row - height);
              }
              if (x + col >= quadWidth) {
                p -= x + col - quadWidth + 4;
              }
              r = imageData[p++];
              g = imageData[p++];
              b = imageData[p++];
              YDU[pos] = (RGB_YUV_TABLE[r] + RGB_YUV_TABLE[g + 256 >> 0] + RGB_YUV_TABLE[b + 512 >> 0] >> 16) - 128;
              UDU[pos] = (RGB_YUV_TABLE[r + 768 >> 0] + RGB_YUV_TABLE[g + 1024 >> 0] + RGB_YUV_TABLE[b + 1280 >> 0] >> 16) - 128;
              VDU[pos] = (RGB_YUV_TABLE[r + 1280 >> 0] + RGB_YUV_TABLE[g + 1536 >> 0] + RGB_YUV_TABLE[b + 1792 >> 0] >> 16) - 128;
            }
            DCY = processDU(YDU, fdtbl_Y, DCY, YDC_HT, YAC_HT);
            DCU = processDU(UDU, fdtbl_UV, DCU, UVDC_HT, UVAC_HT);
            DCV = processDU(VDU, fdtbl_UV, DCV, UVDC_HT, UVAC_HT);
            x += 32;
          }
          y += 8;
        }
        if (bytepos >= 0) {
          var fillbits = [];
          fillbits[1] = bytepos + 1;
          fillbits[0] = (1 << bytepos + 1) - 1;
          writeBits(fillbits);
        }
        writeWord(65497);
        if (typeof module === "undefined") return new Uint8Array(byteout);
        return Buffer.from(byteout);
        var jpegDataUri = "data:image/jpeg;base64," + btoa(byteout.join(""));
        byteout = [];
        var duration = (/* @__PURE__ */ new Date()).getTime() - time_start;
        return jpegDataUri;
      };
      function setQuality(quality2) {
        if (quality2 <= 0) {
          quality2 = 1;
        }
        if (quality2 > 100) {
          quality2 = 100;
        }
        if (currentQuality == quality2) return;
        var sf = 0;
        if (quality2 < 50) {
          sf = Math.floor(5e3 / quality2);
        } else {
          sf = Math.floor(200 - quality2 * 2);
        }
        initQuantTables(sf);
        currentQuality = quality2;
      }
      function init() {
        var time_start = (/* @__PURE__ */ new Date()).getTime();
        if (!quality) quality = 50;
        initCharLookupTable();
        initHuffmanTbl();
        initCategoryNumber();
        initRGBYUVTable();
        setQuality(quality);
        var duration = (/* @__PURE__ */ new Date()).getTime() - time_start;
      }
      init();
    }
    if (typeof module !== "undefined") {
      module.exports = encode;
    } else if (typeof window !== "undefined") {
      window["jpeg-js"] = window["jpeg-js"] || {};
      window["jpeg-js"].encode = encode;
    }
    function encode(imgData, qu) {
      if (typeof qu === "undefined") qu = 50;
      var encoder = new JPEGEncoder(qu);
      var data = encoder.encode(imgData, qu);
      return {
        data,
        width: imgData.width,
        height: imgData.height
      };
    }
  }
});

// node_modules/jpeg-js/lib/decoder.js
var require_decoder = __commonJS({
  "node_modules/jpeg-js/lib/decoder.js"(exports, module) {
    var JpegImage = (function jpegImage() {
      "use strict";
      var dctZigZag = new Int32Array([
        0,
        1,
        8,
        16,
        9,
        2,
        3,
        10,
        17,
        24,
        32,
        25,
        18,
        11,
        4,
        5,
        12,
        19,
        26,
        33,
        40,
        48,
        41,
        34,
        27,
        20,
        13,
        6,
        7,
        14,
        21,
        28,
        35,
        42,
        49,
        56,
        57,
        50,
        43,
        36,
        29,
        22,
        15,
        23,
        30,
        37,
        44,
        51,
        58,
        59,
        52,
        45,
        38,
        31,
        39,
        46,
        53,
        60,
        61,
        54,
        47,
        55,
        62,
        63
      ]);
      var dctCos1 = 4017;
      var dctSin1 = 799;
      var dctCos3 = 3406;
      var dctSin3 = 2276;
      var dctCos6 = 1567;
      var dctSin6 = 3784;
      var dctSqrt2 = 5793;
      var dctSqrt1d2 = 2896;
      function constructor() {
      }
      function buildHuffmanTable(codeLengths, values) {
        var k = 0, code = [], i, j, length = 16;
        while (length > 0 && !codeLengths[length - 1])
          length--;
        code.push({ children: [], index: 0 });
        var p = code[0], q;
        for (i = 0; i < length; i++) {
          for (j = 0; j < codeLengths[i]; j++) {
            p = code.pop();
            p.children[p.index] = values[k];
            while (p.index > 0) {
              if (code.length === 0)
                throw new Error("Could not recreate Huffman Table");
              p = code.pop();
            }
            p.index++;
            code.push(p);
            while (code.length <= i) {
              code.push(q = { children: [], index: 0 });
              p.children[p.index] = q.children;
              p = q;
            }
            k++;
          }
          if (i + 1 < length) {
            code.push(q = { children: [], index: 0 });
            p.children[p.index] = q.children;
            p = q;
          }
        }
        return code[0].children;
      }
      function decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successivePrev, successive, opts) {
        var precision = frame.precision;
        var samplesPerLine = frame.samplesPerLine;
        var scanLines = frame.scanLines;
        var mcusPerLine = frame.mcusPerLine;
        var progressive = frame.progressive;
        var maxH = frame.maxH, maxV = frame.maxV;
        var startOffset = offset, bitsData = 0, bitsCount = 0;
        function readBit() {
          if (bitsCount > 0) {
            bitsCount--;
            return bitsData >> bitsCount & 1;
          }
          bitsData = data[offset++];
          if (bitsData == 255) {
            var nextByte = data[offset++];
            if (nextByte) {
              throw new Error("unexpected marker: " + (bitsData << 8 | nextByte).toString(16));
            }
          }
          bitsCount = 7;
          return bitsData >>> 7;
        }
        function decodeHuffman(tree) {
          var node = tree, bit;
          while ((bit = readBit()) !== null) {
            node = node[bit];
            if (typeof node === "number")
              return node;
            if (typeof node !== "object")
              throw new Error("invalid huffman sequence");
          }
          return null;
        }
        function receive(length) {
          var n2 = 0;
          while (length > 0) {
            var bit = readBit();
            if (bit === null) return;
            n2 = n2 << 1 | bit;
            length--;
          }
          return n2;
        }
        function receiveAndExtend(length) {
          var n2 = receive(length);
          if (n2 >= 1 << length - 1)
            return n2;
          return n2 + (-1 << length) + 1;
        }
        function decodeBaseline(component2, zz) {
          var t = decodeHuffman(component2.huffmanTableDC);
          var diff = t === 0 ? 0 : receiveAndExtend(t);
          zz[0] = component2.pred += diff;
          var k2 = 1;
          while (k2 < 64) {
            var rs = decodeHuffman(component2.huffmanTableAC);
            var s = rs & 15, r = rs >> 4;
            if (s === 0) {
              if (r < 15)
                break;
              k2 += 16;
              continue;
            }
            k2 += r;
            var z = dctZigZag[k2];
            zz[z] = receiveAndExtend(s);
            k2++;
          }
        }
        function decodeDCFirst(component2, zz) {
          var t = decodeHuffman(component2.huffmanTableDC);
          var diff = t === 0 ? 0 : receiveAndExtend(t) << successive;
          zz[0] = component2.pred += diff;
        }
        function decodeDCSuccessive(component2, zz) {
          zz[0] |= readBit() << successive;
        }
        var eobrun = 0;
        function decodeACFirst(component2, zz) {
          if (eobrun > 0) {
            eobrun--;
            return;
          }
          var k2 = spectralStart, e = spectralEnd;
          while (k2 <= e) {
            var rs = decodeHuffman(component2.huffmanTableAC);
            var s = rs & 15, r = rs >> 4;
            if (s === 0) {
              if (r < 15) {
                eobrun = receive(r) + (1 << r) - 1;
                break;
              }
              k2 += 16;
              continue;
            }
            k2 += r;
            var z = dctZigZag[k2];
            zz[z] = receiveAndExtend(s) * (1 << successive);
            k2++;
          }
        }
        var successiveACState = 0, successiveACNextValue;
        function decodeACSuccessive(component2, zz) {
          var k2 = spectralStart, e = spectralEnd, r = 0;
          while (k2 <= e) {
            var z = dctZigZag[k2];
            var direction = zz[z] < 0 ? -1 : 1;
            switch (successiveACState) {
              case 0:
                var rs = decodeHuffman(component2.huffmanTableAC);
                var s = rs & 15, r = rs >> 4;
                if (s === 0) {
                  if (r < 15) {
                    eobrun = receive(r) + (1 << r);
                    successiveACState = 4;
                  } else {
                    r = 16;
                    successiveACState = 1;
                  }
                } else {
                  if (s !== 1)
                    throw new Error("invalid ACn encoding");
                  successiveACNextValue = receiveAndExtend(s);
                  successiveACState = r ? 2 : 3;
                }
                continue;
              case 1:
              // skipping r zero items
              case 2:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                else {
                  r--;
                  if (r === 0)
                    successiveACState = successiveACState == 2 ? 3 : 0;
                }
                break;
              case 3:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                else {
                  zz[z] = successiveACNextValue << successive;
                  successiveACState = 0;
                }
                break;
              case 4:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                break;
            }
            k2++;
          }
          if (successiveACState === 4) {
            eobrun--;
            if (eobrun === 0)
              successiveACState = 0;
          }
        }
        function decodeMcu(component2, decode2, mcu2, row, col) {
          var mcuRow = mcu2 / mcusPerLine | 0;
          var mcuCol = mcu2 % mcusPerLine;
          var blockRow = mcuRow * component2.v + row;
          var blockCol = mcuCol * component2.h + col;
          if (component2.blocks[blockRow] === void 0 && opts.tolerantDecoding)
            return;
          decode2(component2, component2.blocks[blockRow][blockCol]);
        }
        function decodeBlock(component2, decode2, mcu2) {
          var blockRow = mcu2 / component2.blocksPerLine | 0;
          var blockCol = mcu2 % component2.blocksPerLine;
          if (component2.blocks[blockRow] === void 0 && opts.tolerantDecoding)
            return;
          decode2(component2, component2.blocks[blockRow][blockCol]);
        }
        var componentsLength = components.length;
        var component, i, j, k, n;
        var decodeFn;
        if (progressive) {
          if (spectralStart === 0)
            decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
          else
            decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
        } else {
          decodeFn = decodeBaseline;
        }
        var mcu = 0, marker;
        var mcuExpected;
        if (componentsLength == 1) {
          mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
        } else {
          mcuExpected = mcusPerLine * frame.mcusPerColumn;
        }
        if (!resetInterval) resetInterval = mcuExpected;
        var h, v;
        while (mcu < mcuExpected) {
          for (i = 0; i < componentsLength; i++)
            components[i].pred = 0;
          eobrun = 0;
          if (componentsLength == 1) {
            component = components[0];
            for (n = 0; n < resetInterval; n++) {
              decodeBlock(component, decodeFn, mcu);
              mcu++;
            }
          } else {
            for (n = 0; n < resetInterval; n++) {
              for (i = 0; i < componentsLength; i++) {
                component = components[i];
                h = component.h;
                v = component.v;
                for (j = 0; j < v; j++) {
                  for (k = 0; k < h; k++) {
                    decodeMcu(component, decodeFn, mcu, j, k);
                  }
                }
              }
              mcu++;
              if (mcu === mcuExpected) break;
            }
          }
          if (mcu === mcuExpected) {
            do {
              if (data[offset] === 255) {
                if (data[offset + 1] !== 0) {
                  break;
                }
              }
              offset += 1;
            } while (offset < data.length - 2);
          }
          bitsCount = 0;
          marker = data[offset] << 8 | data[offset + 1];
          if (marker < 65280) {
            throw new Error("marker was not found");
          }
          if (marker >= 65488 && marker <= 65495) {
            offset += 2;
          } else
            break;
        }
        return offset - startOffset;
      }
      function buildComponentData(frame, component) {
        var lines = [];
        var blocksPerLine = component.blocksPerLine;
        var blocksPerColumn = component.blocksPerColumn;
        var samplesPerLine = blocksPerLine << 3;
        var R = new Int32Array(64), r = new Uint8Array(64);
        function quantizeAndInverse(zz, dataOut, dataIn) {
          var qt = component.quantizationTable;
          var v0, v1, v2, v3, v4, v5, v6, v7, t;
          var p = dataIn;
          var i2;
          for (i2 = 0; i2 < 64; i2++)
            p[i2] = zz[i2] * qt[i2];
          for (i2 = 0; i2 < 8; ++i2) {
            var row = 8 * i2;
            if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 && p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 && p[7 + row] == 0) {
              t = dctSqrt2 * p[0 + row] + 512 >> 10;
              p[0 + row] = t;
              p[1 + row] = t;
              p[2 + row] = t;
              p[3 + row] = t;
              p[4 + row] = t;
              p[5 + row] = t;
              p[6 + row] = t;
              p[7 + row] = t;
              continue;
            }
            v0 = dctSqrt2 * p[0 + row] + 128 >> 8;
            v1 = dctSqrt2 * p[4 + row] + 128 >> 8;
            v2 = p[2 + row];
            v3 = p[6 + row];
            v4 = dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128 >> 8;
            v7 = dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128 >> 8;
            v5 = p[3 + row] << 4;
            v6 = p[5 + row] << 4;
            t = v0 - v1 + 1 >> 1;
            v0 = v0 + v1 + 1 >> 1;
            v1 = t;
            t = v2 * dctSin6 + v3 * dctCos6 + 128 >> 8;
            v2 = v2 * dctCos6 - v3 * dctSin6 + 128 >> 8;
            v3 = t;
            t = v4 - v6 + 1 >> 1;
            v4 = v4 + v6 + 1 >> 1;
            v6 = t;
            t = v7 + v5 + 1 >> 1;
            v5 = v7 - v5 + 1 >> 1;
            v7 = t;
            t = v0 - v3 + 1 >> 1;
            v0 = v0 + v3 + 1 >> 1;
            v3 = t;
            t = v1 - v2 + 1 >> 1;
            v1 = v1 + v2 + 1 >> 1;
            v2 = t;
            t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
            v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
            v7 = t;
            t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
            v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
            v6 = t;
            p[0 + row] = v0 + v7;
            p[7 + row] = v0 - v7;
            p[1 + row] = v1 + v6;
            p[6 + row] = v1 - v6;
            p[2 + row] = v2 + v5;
            p[5 + row] = v2 - v5;
            p[3 + row] = v3 + v4;
            p[4 + row] = v3 - v4;
          }
          for (i2 = 0; i2 < 8; ++i2) {
            var col = i2;
            if (p[1 * 8 + col] == 0 && p[2 * 8 + col] == 0 && p[3 * 8 + col] == 0 && p[4 * 8 + col] == 0 && p[5 * 8 + col] == 0 && p[6 * 8 + col] == 0 && p[7 * 8 + col] == 0) {
              t = dctSqrt2 * dataIn[i2 + 0] + 8192 >> 14;
              p[0 * 8 + col] = t;
              p[1 * 8 + col] = t;
              p[2 * 8 + col] = t;
              p[3 * 8 + col] = t;
              p[4 * 8 + col] = t;
              p[5 * 8 + col] = t;
              p[6 * 8 + col] = t;
              p[7 * 8 + col] = t;
              continue;
            }
            v0 = dctSqrt2 * p[0 * 8 + col] + 2048 >> 12;
            v1 = dctSqrt2 * p[4 * 8 + col] + 2048 >> 12;
            v2 = p[2 * 8 + col];
            v3 = p[6 * 8 + col];
            v4 = dctSqrt1d2 * (p[1 * 8 + col] - p[7 * 8 + col]) + 2048 >> 12;
            v7 = dctSqrt1d2 * (p[1 * 8 + col] + p[7 * 8 + col]) + 2048 >> 12;
            v5 = p[3 * 8 + col];
            v6 = p[5 * 8 + col];
            t = v0 - v1 + 1 >> 1;
            v0 = v0 + v1 + 1 >> 1;
            v1 = t;
            t = v2 * dctSin6 + v3 * dctCos6 + 2048 >> 12;
            v2 = v2 * dctCos6 - v3 * dctSin6 + 2048 >> 12;
            v3 = t;
            t = v4 - v6 + 1 >> 1;
            v4 = v4 + v6 + 1 >> 1;
            v6 = t;
            t = v7 + v5 + 1 >> 1;
            v5 = v7 - v5 + 1 >> 1;
            v7 = t;
            t = v0 - v3 + 1 >> 1;
            v0 = v0 + v3 + 1 >> 1;
            v3 = t;
            t = v1 - v2 + 1 >> 1;
            v1 = v1 + v2 + 1 >> 1;
            v2 = t;
            t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
            v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
            v7 = t;
            t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
            v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
            v6 = t;
            p[0 * 8 + col] = v0 + v7;
            p[7 * 8 + col] = v0 - v7;
            p[1 * 8 + col] = v1 + v6;
            p[6 * 8 + col] = v1 - v6;
            p[2 * 8 + col] = v2 + v5;
            p[5 * 8 + col] = v2 - v5;
            p[3 * 8 + col] = v3 + v4;
            p[4 * 8 + col] = v3 - v4;
          }
          for (i2 = 0; i2 < 64; ++i2) {
            var sample2 = 128 + (p[i2] + 8 >> 4);
            dataOut[i2] = sample2 < 0 ? 0 : sample2 > 255 ? 255 : sample2;
          }
        }
        requestMemoryAllocation(samplesPerLine * blocksPerColumn * 8);
        var i, j;
        for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
          var scanLine = blockRow << 3;
          for (i = 0; i < 8; i++)
            lines.push(new Uint8Array(samplesPerLine));
          for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
            quantizeAndInverse(component.blocks[blockRow][blockCol], r, R);
            var offset = 0, sample = blockCol << 3;
            for (j = 0; j < 8; j++) {
              var line = lines[scanLine + j];
              for (i = 0; i < 8; i++)
                line[sample + i] = r[offset++];
            }
          }
        }
        return lines;
      }
      function clampTo8bit(a) {
        return a < 0 ? 0 : a > 255 ? 255 : a;
      }
      constructor.prototype = {
        load: function load(path) {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", path, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = (function() {
            var data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
            this.parse(data);
            if (this.onload)
              this.onload();
          }).bind(this);
          xhr.send(null);
        },
        parse: function parse(data) {
          var maxResolutionInPixels = this.opts.maxResolutionInMP * 1e3 * 1e3;
          var offset = 0, length = data.length;
          function readUint16() {
            var value = data[offset] << 8 | data[offset + 1];
            offset += 2;
            return value;
          }
          function readDataBlock() {
            var length2 = readUint16();
            var array = data.subarray(offset, offset + length2 - 2);
            offset += array.length;
            return array;
          }
          function prepareComponents(frame2) {
            var maxH2 = 1, maxV2 = 1;
            var component2, componentId2;
            for (componentId2 in frame2.components) {
              if (frame2.components.hasOwnProperty(componentId2)) {
                component2 = frame2.components[componentId2];
                if (maxH2 < component2.h) maxH2 = component2.h;
                if (maxV2 < component2.v) maxV2 = component2.v;
              }
            }
            var mcusPerLine = Math.ceil(frame2.samplesPerLine / 8 / maxH2);
            var mcusPerColumn = Math.ceil(frame2.scanLines / 8 / maxV2);
            for (componentId2 in frame2.components) {
              if (frame2.components.hasOwnProperty(componentId2)) {
                component2 = frame2.components[componentId2];
                var blocksPerLine = Math.ceil(Math.ceil(frame2.samplesPerLine / 8) * component2.h / maxH2);
                var blocksPerColumn = Math.ceil(Math.ceil(frame2.scanLines / 8) * component2.v / maxV2);
                var blocksPerLineForMcu = mcusPerLine * component2.h;
                var blocksPerColumnForMcu = mcusPerColumn * component2.v;
                var blocksToAllocate = blocksPerColumnForMcu * blocksPerLineForMcu;
                var blocks = [];
                requestMemoryAllocation(blocksToAllocate * 256);
                for (var i2 = 0; i2 < blocksPerColumnForMcu; i2++) {
                  var row = [];
                  for (var j2 = 0; j2 < blocksPerLineForMcu; j2++)
                    row.push(new Int32Array(64));
                  blocks.push(row);
                }
                component2.blocksPerLine = blocksPerLine;
                component2.blocksPerColumn = blocksPerColumn;
                component2.blocks = blocks;
              }
            }
            frame2.maxH = maxH2;
            frame2.maxV = maxV2;
            frame2.mcusPerLine = mcusPerLine;
            frame2.mcusPerColumn = mcusPerColumn;
          }
          var jfif = null;
          var adobe = null;
          var pixels = null;
          var frame, resetInterval;
          var quantizationTables = [], frames = [];
          var huffmanTablesAC = [], huffmanTablesDC = [];
          var fileMarker = readUint16();
          var malformedDataOffset = -1;
          this.comments = [];
          if (fileMarker != 65496) {
            throw new Error("SOI not found");
          }
          fileMarker = readUint16();
          while (fileMarker != 65497) {
            var i, j, l;
            switch (fileMarker) {
              case 65280:
                break;
              case 65504:
              // APP0 (Application Specific)
              case 65505:
              // APP1
              case 65506:
              // APP2
              case 65507:
              // APP3
              case 65508:
              // APP4
              case 65509:
              // APP5
              case 65510:
              // APP6
              case 65511:
              // APP7
              case 65512:
              // APP8
              case 65513:
              // APP9
              case 65514:
              // APP10
              case 65515:
              // APP11
              case 65516:
              // APP12
              case 65517:
              // APP13
              case 65518:
              // APP14
              case 65519:
              // APP15
              case 65534:
                var appData = readDataBlock();
                if (fileMarker === 65534) {
                  var comment = String.fromCharCode.apply(null, appData);
                  this.comments.push(comment);
                }
                if (fileMarker === 65504) {
                  if (appData[0] === 74 && appData[1] === 70 && appData[2] === 73 && appData[3] === 70 && appData[4] === 0) {
                    jfif = {
                      version: { major: appData[5], minor: appData[6] },
                      densityUnits: appData[7],
                      xDensity: appData[8] << 8 | appData[9],
                      yDensity: appData[10] << 8 | appData[11],
                      thumbWidth: appData[12],
                      thumbHeight: appData[13],
                      thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
                    };
                  }
                }
                if (fileMarker === 65505) {
                  if (appData[0] === 69 && appData[1] === 120 && appData[2] === 105 && appData[3] === 102 && appData[4] === 0) {
                    this.exifBuffer = appData.subarray(5, appData.length);
                  }
                }
                if (fileMarker === 65518) {
                  if (appData[0] === 65 && appData[1] === 100 && appData[2] === 111 && appData[3] === 98 && appData[4] === 101 && appData[5] === 0) {
                    adobe = {
                      version: appData[6],
                      flags0: appData[7] << 8 | appData[8],
                      flags1: appData[9] << 8 | appData[10],
                      transformCode: appData[11]
                    };
                  }
                }
                break;
              case 65499:
                var quantizationTablesLength = readUint16();
                var quantizationTablesEnd = quantizationTablesLength + offset - 2;
                while (offset < quantizationTablesEnd) {
                  var quantizationTableSpec = data[offset++];
                  requestMemoryAllocation(64 * 4);
                  var tableData = new Int32Array(64);
                  if (quantizationTableSpec >> 4 === 0) {
                    for (j = 0; j < 64; j++) {
                      var z = dctZigZag[j];
                      tableData[z] = data[offset++];
                    }
                  } else if (quantizationTableSpec >> 4 === 1) {
                    for (j = 0; j < 64; j++) {
                      var z = dctZigZag[j];
                      tableData[z] = readUint16();
                    }
                  } else
                    throw new Error("DQT: invalid table spec");
                  quantizationTables[quantizationTableSpec & 15] = tableData;
                }
                break;
              case 65472:
              // SOF0 (Start of Frame, Baseline DCT)
              case 65473:
              // SOF1 (Start of Frame, Extended DCT)
              case 65474:
                readUint16();
                frame = {};
                frame.extended = fileMarker === 65473;
                frame.progressive = fileMarker === 65474;
                frame.precision = data[offset++];
                frame.scanLines = readUint16();
                frame.samplesPerLine = readUint16();
                frame.components = {};
                frame.componentsOrder = [];
                var pixelsInFrame = frame.scanLines * frame.samplesPerLine;
                if (pixelsInFrame > maxResolutionInPixels) {
                  var exceededAmount = Math.ceil((pixelsInFrame - maxResolutionInPixels) / 1e6);
                  throw new Error(`maxResolutionInMP limit exceeded by ${exceededAmount}MP`);
                }
                var componentsCount = data[offset++], componentId;
                var maxH = 0, maxV = 0;
                for (i = 0; i < componentsCount; i++) {
                  componentId = data[offset];
                  var h = data[offset + 1] >> 4;
                  var v = data[offset + 1] & 15;
                  var qId = data[offset + 2];
                  if (h <= 0 || v <= 0) {
                    throw new Error("Invalid sampling factor, expected values above 0");
                  }
                  frame.componentsOrder.push(componentId);
                  frame.components[componentId] = {
                    h,
                    v,
                    quantizationIdx: qId
                  };
                  offset += 3;
                }
                prepareComponents(frame);
                frames.push(frame);
                break;
              case 65476:
                var huffmanLength = readUint16();
                for (i = 2; i < huffmanLength; ) {
                  var huffmanTableSpec = data[offset++];
                  var codeLengths = new Uint8Array(16);
                  var codeLengthSum = 0;
                  for (j = 0; j < 16; j++, offset++) {
                    codeLengthSum += codeLengths[j] = data[offset];
                  }
                  requestMemoryAllocation(16 + codeLengthSum);
                  var huffmanValues = new Uint8Array(codeLengthSum);
                  for (j = 0; j < codeLengthSum; j++, offset++)
                    huffmanValues[j] = data[offset];
                  i += 17 + codeLengthSum;
                  (huffmanTableSpec >> 4 === 0 ? huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] = buildHuffmanTable(codeLengths, huffmanValues);
                }
                break;
              case 65501:
                readUint16();
                resetInterval = readUint16();
                break;
              case 65500:
                readUint16();
                readUint16();
                break;
              case 65498:
                var scanLength = readUint16();
                var selectorsCount = data[offset++];
                var components = [], component;
                for (i = 0; i < selectorsCount; i++) {
                  component = frame.components[data[offset++]];
                  var tableSpec = data[offset++];
                  component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
                  component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
                  components.push(component);
                }
                var spectralStart = data[offset++];
                var spectralEnd = data[offset++];
                var successiveApproximation = data[offset++];
                var processed = decodeScan(
                  data,
                  offset,
                  frame,
                  components,
                  resetInterval,
                  spectralStart,
                  spectralEnd,
                  successiveApproximation >> 4,
                  successiveApproximation & 15,
                  this.opts
                );
                offset += processed;
                break;
              case 65535:
                if (data[offset] !== 255) {
                  offset--;
                }
                break;
              default:
                if (data[offset - 3] == 255 && data[offset - 2] >= 192 && data[offset - 2] <= 254) {
                  offset -= 3;
                  break;
                } else if (fileMarker === 224 || fileMarker == 225) {
                  if (malformedDataOffset !== -1) {
                    throw new Error(`first unknown JPEG marker at offset ${malformedDataOffset.toString(16)}, second unknown JPEG marker ${fileMarker.toString(16)} at offset ${(offset - 1).toString(16)}`);
                  }
                  malformedDataOffset = offset - 1;
                  const nextOffset = readUint16();
                  if (data[offset + nextOffset - 2] === 255) {
                    offset += nextOffset - 2;
                    break;
                  }
                }
                throw new Error("unknown JPEG marker " + fileMarker.toString(16));
            }
            fileMarker = readUint16();
          }
          if (frames.length != 1)
            throw new Error("only single frame JPEGs supported");
          for (var i = 0; i < frames.length; i++) {
            var cp = frames[i].components;
            for (var j in cp) {
              cp[j].quantizationTable = quantizationTables[cp[j].quantizationIdx];
              delete cp[j].quantizationIdx;
            }
          }
          this.width = frame.samplesPerLine;
          this.height = frame.scanLines;
          this.jfif = jfif;
          this.adobe = adobe;
          this.components = [];
          for (var i = 0; i < frame.componentsOrder.length; i++) {
            var component = frame.components[frame.componentsOrder[i]];
            this.components.push({
              lines: buildComponentData(frame, component),
              scaleX: component.h / frame.maxH,
              scaleY: component.v / frame.maxV
            });
          }
        },
        getData: function getData(width, height) {
          var scaleX = this.width / width, scaleY = this.height / height;
          var component1, component2, component3, component4;
          var component1Line, component2Line, component3Line, component4Line;
          var x, y;
          var offset = 0;
          var Y, Cb, Cr, K, C, M, Ye, R, G, B;
          var colorTransform;
          var dataLength = width * height * this.components.length;
          requestMemoryAllocation(dataLength);
          var data = new Uint8Array(dataLength);
          switch (this.components.length) {
            case 1:
              component1 = this.components[0];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  Y = component1Line[0 | x * component1.scaleX * scaleX];
                  data[offset++] = Y;
                }
              }
              break;
            case 2:
              component1 = this.components[0];
              component2 = this.components[1];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  Y = component1Line[0 | x * component1.scaleX * scaleX];
                  data[offset++] = Y;
                  Y = component2Line[0 | x * component2.scaleX * scaleX];
                  data[offset++] = Y;
                }
              }
              break;
            case 3:
              colorTransform = true;
              if (this.adobe && this.adobe.transformCode)
                colorTransform = true;
              else if (typeof this.opts.colorTransform !== "undefined")
                colorTransform = !!this.opts.colorTransform;
              component1 = this.components[0];
              component2 = this.components[1];
              component3 = this.components[2];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  if (!colorTransform) {
                    R = component1Line[0 | x * component1.scaleX * scaleX];
                    G = component2Line[0 | x * component2.scaleX * scaleX];
                    B = component3Line[0 | x * component3.scaleX * scaleX];
                  } else {
                    Y = component1Line[0 | x * component1.scaleX * scaleX];
                    Cb = component2Line[0 | x * component2.scaleX * scaleX];
                    Cr = component3Line[0 | x * component3.scaleX * scaleX];
                    R = clampTo8bit(Y + 1.402 * (Cr - 128));
                    G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                    B = clampTo8bit(Y + 1.772 * (Cb - 128));
                  }
                  data[offset++] = R;
                  data[offset++] = G;
                  data[offset++] = B;
                }
              }
              break;
            case 4:
              if (!this.adobe)
                throw new Error("Unsupported color mode (4 components)");
              colorTransform = false;
              if (this.adobe && this.adobe.transformCode)
                colorTransform = true;
              else if (typeof this.opts.colorTransform !== "undefined")
                colorTransform = !!this.opts.colorTransform;
              component1 = this.components[0];
              component2 = this.components[1];
              component3 = this.components[2];
              component4 = this.components[3];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
                component4Line = component4.lines[0 | y * component4.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  if (!colorTransform) {
                    C = component1Line[0 | x * component1.scaleX * scaleX];
                    M = component2Line[0 | x * component2.scaleX * scaleX];
                    Ye = component3Line[0 | x * component3.scaleX * scaleX];
                    K = component4Line[0 | x * component4.scaleX * scaleX];
                  } else {
                    Y = component1Line[0 | x * component1.scaleX * scaleX];
                    Cb = component2Line[0 | x * component2.scaleX * scaleX];
                    Cr = component3Line[0 | x * component3.scaleX * scaleX];
                    K = component4Line[0 | x * component4.scaleX * scaleX];
                    C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
                    M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                    Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
                  }
                  data[offset++] = 255 - C;
                  data[offset++] = 255 - M;
                  data[offset++] = 255 - Ye;
                  data[offset++] = 255 - K;
                }
              }
              break;
            default:
              throw new Error("Unsupported color mode");
          }
          return data;
        },
        copyToImageData: function copyToImageData(imageData, formatAsRGBA) {
          var width = imageData.width, height = imageData.height;
          var imageDataArray = imageData.data;
          var data = this.getData(width, height);
          var i = 0, j = 0, x, y;
          var Y, K, C, M, R, G, B;
          switch (this.components.length) {
            case 1:
              for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                  Y = data[i++];
                  imageDataArray[j++] = Y;
                  imageDataArray[j++] = Y;
                  imageDataArray[j++] = Y;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            case 3:
              for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                  R = data[i++];
                  G = data[i++];
                  B = data[i++];
                  imageDataArray[j++] = R;
                  imageDataArray[j++] = G;
                  imageDataArray[j++] = B;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            case 4:
              for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                  C = data[i++];
                  M = data[i++];
                  Y = data[i++];
                  K = data[i++];
                  R = 255 - clampTo8bit(C * (1 - K / 255) + K);
                  G = 255 - clampTo8bit(M * (1 - K / 255) + K);
                  B = 255 - clampTo8bit(Y * (1 - K / 255) + K);
                  imageDataArray[j++] = R;
                  imageDataArray[j++] = G;
                  imageDataArray[j++] = B;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            default:
              throw new Error("Unsupported color mode");
          }
        }
      };
      var totalBytesAllocated = 0;
      var maxMemoryUsageBytes = 0;
      function requestMemoryAllocation(increaseAmount = 0) {
        var totalMemoryImpactBytes = totalBytesAllocated + increaseAmount;
        if (totalMemoryImpactBytes > maxMemoryUsageBytes) {
          var exceededAmount = Math.ceil((totalMemoryImpactBytes - maxMemoryUsageBytes) / 1024 / 1024);
          throw new Error(`maxMemoryUsageInMB limit exceeded by at least ${exceededAmount}MB`);
        }
        totalBytesAllocated = totalMemoryImpactBytes;
      }
      constructor.resetMaxMemoryUsage = function(maxMemoryUsageBytes_) {
        totalBytesAllocated = 0;
        maxMemoryUsageBytes = maxMemoryUsageBytes_;
      };
      constructor.getBytesAllocated = function() {
        return totalBytesAllocated;
      };
      constructor.requestMemoryAllocation = requestMemoryAllocation;
      return constructor;
    })();
    if (typeof module !== "undefined") {
      module.exports = decode;
    } else if (typeof window !== "undefined") {
      window["jpeg-js"] = window["jpeg-js"] || {};
      window["jpeg-js"].decode = decode;
    }
    function decode(jpegData, userOpts = {}) {
      var defaultOpts = {
        // "undefined" means "Choose whether to transform colors based on the image’s color model."
        colorTransform: void 0,
        useTArray: false,
        formatAsRGBA: true,
        tolerantDecoding: true,
        maxResolutionInMP: 100,
        // Don't decode more than 100 megapixels
        maxMemoryUsageInMB: 512
        // Don't decode if memory footprint is more than 512MB
      };
      var opts = { ...defaultOpts, ...userOpts };
      var arr = new Uint8Array(jpegData);
      var decoder = new JpegImage();
      decoder.opts = opts;
      JpegImage.resetMaxMemoryUsage(opts.maxMemoryUsageInMB * 1024 * 1024);
      decoder.parse(arr);
      var channels = opts.formatAsRGBA ? 4 : 3;
      var bytesNeeded = decoder.width * decoder.height * channels;
      try {
        JpegImage.requestMemoryAllocation(bytesNeeded);
        var image = {
          width: decoder.width,
          height: decoder.height,
          exifBuffer: decoder.exifBuffer,
          data: opts.useTArray ? new Uint8Array(bytesNeeded) : Buffer.alloc(bytesNeeded)
        };
        if (decoder.comments.length > 0) {
          image["comments"] = decoder.comments;
        }
      } catch (err) {
        if (err instanceof RangeError) {
          throw new Error("Could not allocate enough memory for the image. Required: " + bytesNeeded);
        }
        if (err instanceof ReferenceError) {
          if (err.message === "Buffer is not defined") {
            throw new Error("Buffer is not globally defined in this environment. Consider setting useTArray to true");
          }
        }
        throw err;
      }
      decoder.copyToImageData(image, opts.formatAsRGBA);
      return image;
    }
  }
});

// node_modules/jpeg-js/index.js
var require_jpeg_js = __commonJS({
  "node_modules/jpeg-js/index.js"(exports, module) {
    var encode = require_encoder();
    var decode = require_decoder();
    module.exports = {
      encode,
      decode
    };
  }
});

// src/engine-child.ts
var import_jpeg_js3 = __toESM(require_jpeg_js(), 1);
import { randomUUID } from "node:crypto";

// src/detector.ts
import { createHash } from "node:crypto";

// src/protocol.ts
function sameDeltaDisplay(a, b) {
  return a.id === b.id && a.name === b.name && a.primary === b.primary && a.systemNumber === b.systemNumber && a.scaleFactor === b.scaleFactor && a.rotation === b.rotation && a.bounds.x === b.bounds.x && a.bounds.y === b.bounds.y && a.bounds.width === b.bounds.width && a.bounds.height === b.bounds.height;
}
var DEFAULT_GAME_ASPECT_RATIO = "16:10";

// src/limits.ts
var DELTA_MAX_JPEG_BYTES = 2 * 1024 * 1024;
var DELTA_MAX_ROI_AREA = 0.25;
var DELTA_MAX_ROI_PIXELS = 2e6;
var DELTA_MAX_LOOT_ITEMS_PIXELS = 15e5;
var DELTA_MAX_LOOT_CONTEXT_PIXELS = 128e3;
var DELTA_MAX_LOOT_ROI_AREA = 0.5;
var DELTA_LOOT_SAMPLE_INTERVAL_MS = 2e3;
var DELTA_MAX_LOOT_CANDIDATES = 4;
var DELTA_MAX_LOOT_REFERENCES = 32;
var DELTA_LOOT_RETAIN_MS = 6e4;
var DELTA_OCR_TRANSIENT_FAILURE_LIMIT = 3;
function deltaOcrBackoffMs(failures) {
  return Math.min(4e3, 1e3 * 2 ** Math.max(0, failures - 1));
}

// src/rect.ts
function unionRect(a, b) {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}
function unionRects(boxes) {
  const x = Math.min(...boxes.map((box) => box.x)), y = Math.min(...boxes.map((box) => box.y));
  return { x, y, width: Math.max(...boxes.map((box) => box.x + box.width)) - x, height: Math.max(...boxes.map((box) => box.y + box.height)) - y };
}

// src/roi.ts
function captureRoi(value) {
  if (!value || typeof value !== "object") return null;
  const roi = value;
  if (![roi.x, roi.y, roi.width, roi.height].every(Number.isFinite) || roi.x < 0 || roi.y < 0 || roi.width <= 0 || roi.height <= 0 || roi.x + roi.width > 1 || roi.y + roi.height > 1) return null;
  return { x: roi.x, y: roi.y, width: roi.width, height: roi.height };
}
function outwardRectangle(roi, width, height) {
  const x = Math.floor(roi.x * width), y = Math.floor(roi.y * height);
  return {
    x,
    y,
    width: Math.max(1, Math.min(width - x, Math.ceil((roi.x + roi.width) * width) - x)),
    height: Math.max(1, Math.min(height - y, Math.ceil((roi.y + roi.height) * height) - y))
  };
}
function captureRectangle(roi, width, height) {
  if (!captureRoi(roi)) throw new Error("Invalid capture region");
  return outwardRectangle(roi, width, height);
}

// src/budget.ts
function acceptedRoi(roi) {
  return captureRoi(roi) !== null;
}
function combatSelectionTooLarge(regions, width, height) {
  const area = regions.reduce((total, roi) => total + roi.width * roi.height, 0);
  const pixels = regions.reduce((total, roi) => {
    const box = outwardRectangle(roi, width, height);
    return total + box.width * box.height;
  }, 0);
  return area > DELTA_MAX_ROI_AREA || pixels > DELTA_MAX_ROI_PIXELS;
}
function calibrationFitsBudget(calibration) {
  try {
    const regions = [calibration.roi, ...calibration.personalFeedbackRoi ? [calibration.personalFeedbackRoi] : []];
    const { width, height } = calibration.display.bounds;
    for (const roi of regions) captureRectangle(roi, width, height);
    return !combatSelectionTooLarge(regions, width, height);
  } catch {
    return false;
  }
}
function lootSelectionTooLarge(items, context, width, height, valid) {
  const pixels = (roi) => {
    if (!valid(roi)) return 0;
    const box = outwardRectangle(roi, width, height);
    return box.width * box.height;
  };
  const regions = [items, context].filter(valid);
  const area = regions.reduce((sum, roi) => sum + roi.width * roi.height, 0);
  const bounds = regions.length === 0 ? null : regions.length === 1 ? regions[0] : unionRect(regions[0], regions[1]);
  return pixels(items) > DELTA_MAX_LOOT_ITEMS_PIXELS || pixels(context) > DELTA_MAX_LOOT_CONTEXT_PIXELS || area > DELTA_MAX_LOOT_ROI_AREA || pixels(bounds) > DELTA_MAX_ROI_PIXELS;
}
function lootCalibrationFitsBudget(calibration) {
  try {
    const { width, height } = calibration.display.bounds;
    captureRectangle(calibration.itemsRoi, width, height);
    captureRectangle(calibration.contextRoi, width, height);
    captureRectangle(unionRect(calibration.itemsRoi, calibration.contextRoi), width, height);
    return !lootSelectionTooLarge(calibration.itemsRoi, calibration.contextRoi, width, height, acceptedRoi);
  } catch {
    return false;
  }
}

// src/ocr.ts
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

// src/powershell.ts
import { join } from "node:path";
function powershellExecutable() {
  return join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
}

// src/ocr.ts
var DELTA_OCR_LIMITS = { maxLines: 64, maxWords: 512, maxLineChars: 1024, maxWordChars: 128 };
var OCR_PLATFORM_UNAVAILABLE = "Windows OCR is unavailable on this platform";
function ocrUnavailableOnPlatform(error) {
  return error instanceof Error && error.message === OCR_PLATFORM_UNAVAILABLE;
}
function ocrProcessGone(error) {
  return error instanceof Error && (error.message === "Windows OCR timed out" || error.message === "Windows OCR exited" || error.message === "Windows OCR is closed" || error.message === "Windows OCR stopped");
}
var script = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
try {
  Add-Type -TypeDefinition 'using System; using System.Diagnostics; using System.Threading; public static class DeltaOcrLifetime { private static Timer timer; public static void Watch(int id) { var owner = Process.GetProcessById(id); timer = new Timer(_ => { try { if (owner.HasExited) Environment.Exit(0); } catch { Environment.Exit(0); } }, null, 500, 500); } }'
  [DeltaOcrLifetime]::Watch(__PARENT_PID__)
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]
  $null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType=WindowsRuntime]
  $null = [Windows.Security.Cryptography.CryptographicBuffer, Windows.Security.Cryptography, ContentType=WindowsRuntime]
  $available = @([Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages | ForEach-Object { $_.LanguageTag })
  $requested = '__LANGUAGE__'
  $tag = $available | Where-Object { if ($requested -eq 'en-US') { $_ -like 'en-*' } else { $_ -like 'zh-Hans*' -or $_ -eq 'zh-CN' -or $_ -eq 'zh-SG' } } | Select-Object -First 1
  $engine = $null
  if ($tag) { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language($tag))) }
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation' + [char]96 + '1' } | Select-Object -First 1
  @{kind='ready'; availableLanguages=$available; language=$tag} | ConvertTo-Json -Compress
  $reader = New-Object System.IO.BinaryReader([Console]::OpenStandardInput())
  $magic = [uint32]0x52434F44
  $max = [uint64][Windows.Media.Ocr.OcrEngine]::MaxImageDimension
  while ($true) {
    try { $header = $reader.ReadBytes(16) } catch { exit 1 }
    if ($header.Length -eq 0) { break }
    if ($header.Length -ne 16) { exit 1 }
    $width = [uint64]([BitConverter]::ToUInt32($header, 4))
    $height = [uint64]([BitConverter]::ToUInt32($header, 8))
    $length = [uint64]([BitConverter]::ToUInt32($header, 12))
    if ([BitConverter]::ToUInt32($header, 0) -ne $magic -or $width -lt 1 -or $height -lt 1 -or $width -gt $max -or $height -gt $max -or $length -ne ($width * $height * [uint64]4) -or $length -gt [uint64][int]::MaxValue) { exit 1 }
    try { $bytes = $reader.ReadBytes([int]$length) } catch { exit 1 }
    if ($bytes.Length -ne $length) { exit 1 }
    $bitmap = $null
    try {
      if (!$engine) { throw 'The requested OCR language is unavailable' }
      $bitmap = New-Object Windows.Graphics.Imaging.SoftwareBitmap([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,[int]$width,[int]$height,[Windows.Graphics.Imaging.BitmapAlphaMode]::Ignore)
      $bitmap.CopyFromBuffer([System.Runtime.InteropServices.WindowsRuntime.WindowsRuntimeBufferExtensions]::AsBuffer($bytes))
      $task = $asTask.MakeGenericMethod([Windows.Media.Ocr.OcrResult]).Invoke($null,@($engine.RecognizeAsync($bitmap)))
      $task.Wait()
      $layout = New-Object 'Collections.Generic.List[object]'
      $wordCount = 0
      $truncated = $false
      foreach ($ocrLine in $task.Result.Lines) {
        if ($layout.Count -ge __MAX_LINES__) { $truncated = $true; break }
        $words = New-Object 'Collections.Generic.List[object]'
        foreach ($word in $ocrLine.Words) {
          if ($wordCount -ge __MAX_WORDS__) { $truncated = $true; break }
          $text = [string]$word.Text
          if ($text.Length -gt __MAX_WORD_CHARS__) { $text = $text.Substring(0,__MAX_WORD_CHARS__); $truncated = $true }
          $rect = $word.BoundingRect
          $words.Add(@{text=$text; box=@{x=$rect.X; y=$rect.Y; width=$rect.Width; height=$rect.Height}})
          $wordCount++
        }
        if (!$words.Count) { if ($truncated) { break } else { continue } }
        $text = [string]$ocrLine.Text
        if ($text.Length -gt __MAX_LINE_CHARS__) { $text = $text.Substring(0,__MAX_LINE_CHARS__); $truncated = $true }
        $layout.Add(@{text=$text; words=@($words.ToArray())})
      }
      @{kind='result'; textAngle=$task.Result.TextAngle; lines=@($layout.ToArray()); truncated=$truncated} | ConvertTo-Json -Compress -Depth 8
    } catch { @{kind='error'; message=$_.Exception.Message} | ConvertTo-Json -Compress }
    finally { if ($bitmap) { $bitmap.Dispose() } }
  }
} catch { @{kind='error'; message=$_.Exception.Message} | ConvertTo-Json -Compress; exit 1 }
`;
function sourceBox(value, width, height, angle) {
  const box = value;
  if (!box || ![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width <= 0 || box.height <= 0) throw new Error("Invalid Windows OCR box");
  const radians = angle * Math.PI / 180, cosine = Math.cos(radians), sine = Math.sin(radians);
  const corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]];
  const rotated = corners.map(([x2, y2]) => ({
    x: width / 2 + (x2 - width / 2) * cosine - (y2 - height / 2) * sine,
    y: height / 2 + (x2 - width / 2) * sine + (y2 - height / 2) * cosine
  }));
  const x = Math.max(0, Math.min(width, Math.min(...rotated.map((corner) => corner.x))));
  const y = Math.max(0, Math.min(height, Math.min(...rotated.map((corner) => corner.y))));
  return {
    x,
    y,
    width: Math.max(0, Math.min(width, Math.max(...rotated.map((corner) => corner.x))) - x),
    height: Math.max(0, Math.min(height, Math.max(...rotated.map((corner) => corner.y))) - y)
  };
}
function parseLayout(value, region) {
  const angle = value.textAngle === null ? 0 : value.textAngle;
  if (typeof angle !== "number" || !Number.isFinite(angle) || !Array.isArray(value.lines) || value.lines.length > DELTA_OCR_LIMITS.maxLines || typeof value.truncated !== "boolean") throw new Error("Invalid Windows OCR layout");
  const result = { width: region.width, height: region.height, lines: [], truncated: value.truncated };
  const lines = [];
  let wordCount = 0;
  for (const item of value.lines) {
    const line = item;
    if (typeof line.text !== "string" || line.text.length > DELTA_OCR_LIMITS.maxLineChars || !Array.isArray(line.words)) throw new Error("Invalid Windows OCR line");
    const words = [];
    for (const word of line.words) {
      if (++wordCount > DELTA_OCR_LIMITS.maxWords || typeof word.text !== "string" || word.text.length > DELTA_OCR_LIMITS.maxWordChars) throw new Error("Invalid Windows OCR word");
      const box = sourceBox(word.box, region.width, region.height, angle);
      if (!box.width || !box.height) {
        result.truncated = true;
        continue;
      }
      words.push({ text: word.text, box });
    }
    if (words.length) lines.push({ text: line.text, words, box: unionRects(words.map((word) => word.box)) });
    else result.truncated = true;
  }
  result.lines = lines;
  return result;
}
async function createOcr(language) {
  if (language !== "zh-CN" && language !== "en-US") throw new Error("Unsupported OCR language");
  if (process.platform !== "win32") throw new Error(OCR_PLATFORM_UNAVAILABLE);
  const source2 = script.replace("__LANGUAGE__", language).replace("__PARENT_PID__", String(process.pid)).replaceAll("__MAX_LINES__", String(DELTA_OCR_LIMITS.maxLines)).replaceAll("__MAX_WORDS__", String(DELTA_OCR_LIMITS.maxWords)).replaceAll("__MAX_LINE_CHARS__", String(DELTA_OCR_LIMITS.maxLineChars)).replaceAll("__MAX_WORD_CHARS__", String(DELTA_OCR_LIMITS.maxWordChars));
  const command = Buffer.from(source2, "utf16le").toString("base64");
  const child = spawn(
    powershellExecutable(),
    ["-NoProfile", "-NonInteractive", "-EncodedCommand", command],
    { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }
  );
  let closed = false;
  let markExited = () => {
  };
  const exited = new Promise((resolve) => {
    markExited = resolve;
  });
  let pending = null;
  const fail = (error) => {
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      pending = null;
    }
  };
  const response = (timeoutMs) => new Promise((resolve, reject) => {
    pending = { resolve, reject, timer: setTimeout(() => {
      fail(new Error("Windows OCR timed out"));
      child.kill();
    }, timeoutMs) };
  });
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    if (!pending || line.length > 1024 * 1024) return;
    try {
      const value = JSON.parse(line);
      if (value.kind === "error") {
        fail(new Error(String(value.message)));
        return;
      }
      const request = pending;
      pending = null;
      clearTimeout(request.timer);
      request.resolve(value);
    } catch {
      fail(new Error("Invalid Windows OCR response"));
    }
  });
  child.stderr.on("data", () => {
  });
  child.stdin.on("error", (error) => {
    const code = "code" in error ? error.code : void 0;
    if (code !== "EOF" && code !== "EPIPE") fail(error);
  });
  child.on("error", (error) => fail(error));
  child.on("exit", () => {
    closed = true;
    markExited();
    fail(new Error("Windows OCR exited"));
  });
  const close = async () => {
    if (closed) return;
    closed = true;
    fail(new Error("Windows OCR stopped"));
    lines.close();
    child.stdin.end();
    const stopped2 = new Promise((done) => child.once("exit", () => done()));
    const timer = setTimeout(() => child.kill(), 250);
    await Promise.race([stopped2, new Promise((done) => setTimeout(done, 500))]);
    clearTimeout(timer);
    if (child.exitCode === null) child.kill();
  };
  let ready;
  try {
    ready = await response(8e3);
  } catch (error) {
    await close();
    throw error;
  }
  const recognizeLayout = async (region) => {
    if (closed) throw new Error("Windows OCR is closed");
    if (region.width * region.height > DELTA_MAX_ROI_PIXELS || region.bgra.byteLength !== region.width * region.height * 4) throw new Error("OCR region exceeds pixel limit");
    if (pending) throw new Error("Windows OCR already has a request");
    const result = response(3e3);
    const header2 = Buffer.allocUnsafe(16);
    header2.writeUInt32LE(1380142916, 0);
    header2.writeUInt32LE(region.width, 4);
    header2.writeUInt32LE(region.height, 8);
    header2.writeUInt32LE(region.bgra.byteLength, 12);
    child.stdin.cork();
    child.stdin.write(header2);
    child.stdin.write(region.bgra);
    child.stdin.uncork();
    const value = await result;
    return parseLayout(value, region);
  };
  return {
    pid: child.pid,
    availableLanguages: Array.isArray(ready.availableLanguages) ? ready.availableLanguages.map(String) : [],
    language: typeof ready.language === "string" ? ready.language : null,
    exited,
    recognizeLayout,
    close
  };
}

// src/pixels.ts
function uiGreen(b, g, r) {
  return g >= 105 && g - r >= 48 && g - b >= 24;
}
function bgraGray(b, g, r) {
  return b * 3735 + g * 19235 + r * 9798 + 16384 >> 15;
}

// src/personal-text-fallback.ts
var PERSONAL_TEXT_FALLBACK_LIMITS = {
  maxVariants: 3,
  maxVariantPixels: DELTA_MAX_ROI_PIXELS,
  maxTotalPixels: DELTA_MAX_ROI_PIXELS * 3,
  maxScanPixels: DELTA_MAX_ROI_PIXELS * 4
};
var PERSONAL_TEXT_FALLBACKS = ["high-210", "white-gold-edge", "high-220-narrow"];
var PAD = 16;
function personalTextRaster(source2, kind) {
  const sourceWidth = source2.width, sourceHeight = source2.height;
  const offsetY = kind === "high-220-narrow" ? Math.round(sourceHeight * 15 / 81) : 0;
  const endY = kind === "high-220-narrow" ? Math.round(sourceHeight * 57 / 81) : sourceHeight;
  const height = endY - offsetY, paddedWidth = sourceWidth + PAD * 2, paddedHeight = height + PAD * 2;
  const width = paddedWidth * 2, outputHeight = paddedHeight * 2;
  if (height < 1 || width * outputHeight > PERSONAL_TEXT_FALLBACK_LIMITS.maxVariantPixels) return null;
  const mask = new Uint8Array(paddedWidth * paddedHeight).fill(255);
  const gray = kind === "white-gold-edge" ? new Uint8Array(sourceWidth * sourceHeight) : null;
  if (gray) for (let at = 0, pixel = 0; pixel < gray.length; pixel++, at += 4) {
    gray[pixel] = bgraGray(source2.bgra[at], source2.bgra[at + 1], source2.bgra[at + 2]);
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < sourceWidth; x++) {
    const at = ((y + offsetY) * sourceWidth + x) * 4;
    const b = source2.bgra[at], g = source2.bgra[at + 1], r = source2.bgra[at + 2];
    const low = Math.min(b, g, r), high = Math.max(b, g, r);
    let ink;
    if (gray) {
      let minimum = 255;
      for (let row = Math.max(0, y + offsetY - 2); row <= Math.min(sourceHeight - 1, y + offsetY + 2); row++) {
        for (let column = Math.max(0, x - 2); column <= Math.min(sourceWidth - 1, x + 2); column++) minimum = Math.min(minimum, gray[row * sourceWidth + column]);
      }
      ink = (low >= 170 && high - low <= 55 || r - b >= 50) && gray[(y + offsetY) * sourceWidth + x] - minimum >= 15;
    } else {
      ink = low >= (kind === "high-210" ? 210 : 220) && high - low <= 40 || r > 160 && g > 95 && r - b > 60 && g > b * 1.3;
    }
    mask[(y + PAD) * paddedWidth + x + PAD] = ink ? 0 : 255;
  }
  return { kind, sourceWidth, sourceHeight, offsetY, region: { ...source2, ...doubleOcrRaster(mask, paddedWidth, paddedHeight) } };
}
function doubleOcrRaster(gray, sourceWidth, sourceHeight) {
  const width = sourceWidth * 2, height = sourceHeight * 2;
  const weights = [[-72, 536, 1800, -216], [-216, 1800, 536, -72]];
  const intermediate = new Int32Array(width * sourceHeight), bgra = new Uint8Array(width * height * 4);
  for (let y = 0; y < sourceHeight; y++) for (let x = 0; x < width; x++) {
    const origin = Math.floor((x + 0.5) / 2 - 0.5), coefficients = weights[x % 2];
    let sum = 0;
    for (let k = 0; k < 4; k++) sum += gray[y * sourceWidth + Math.max(0, Math.min(sourceWidth - 1, origin + k - 1))] * coefficients[k];
    intermediate[y * width + x] = sum;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const origin = Math.floor((y + 0.5) / 2 - 0.5), coefficients = weights[y % 2];
    let sum = 0;
    for (let k = 0; k < 4; k++) sum += intermediate[Math.max(0, Math.min(sourceHeight - 1, origin + k - 1)) * width + x] * coefficients[k];
    const value = Math.max(0, Math.min(255, sum + 2097152 >> 22)), at = (y * width + x) * 4;
    bgra[at] = value;
    bgra[at + 1] = value;
    bgra[at + 2] = value;
    bgra[at + 3] = 255;
  }
  return { width, height, bgra };
}
function restorePersonalLayout(layout, raster) {
  const box = (input) => {
    const x = Math.max(0, Math.min(raster.sourceWidth, input.x / 2 - PAD));
    const y = Math.max(0, Math.min(raster.sourceHeight, input.y / 2 - PAD + raster.offsetY));
    return {
      x,
      y,
      width: Math.max(0, Math.min(raster.sourceWidth, (input.x + input.width) / 2 - PAD) - x),
      height: Math.max(0, Math.min(raster.sourceHeight, (input.y + input.height) / 2 - PAD + raster.offsetY) - y)
    };
  };
  let truncated = layout.truncated;
  const lines = layout.lines.map((line) => ({ ...line, box: box(line.box), words: line.words.map((word) => ({ ...word, box: box(word.box) })) }));
  if (lines.some((line) => line.words.some((word) => word.box.width <= 0 || word.box.height <= 0))) truncated = true;
  return { width: raster.sourceWidth, height: raster.sourceHeight, truncated, lines };
}

// src/personal-notification.ts
var PERSONAL_NOTIFICATION_LIMITS = { maxReferences: 8, retainMs: 6e4, maxWidth: 1024, height: 48, coverage: 0.9, minSpanRatio: 0.8, maxBaselineShift: 4 };
function createPersonalSignature(region, action, target) {
  const width = Math.min(region.width, PERSONAL_NOTIFICATION_LIMITS.maxWidth), height = PERSONAL_NOTIFICATION_LIMITS.height;
  const top = Math.round(action.y + action.height / 2 - height / 2), pixels = new Uint8Array(width * height);
  const signature = (mode, mask) => {
    if (!target) return { mode, width, height, pixels: mask };
    const scale = width / region.width, left = Math.ceil((action.x + action.width) * scale), gap = Math.max(1, Math.ceil(action.height * scale * 0.6));
    let first = -1, last = -1, ink = 0;
    const keep = () => ink >= 16 && first - left <= action.height * scale * 1.5 && last >= target.x * scale && first <= (target.x + target.width) * scale;
    for (let x = left; x < width; x++) {
      let count = 0;
      for (let y = 0; y < height; y++) count += mask[y * width + x];
      if (count < 2) continue;
      if (last >= 0 && x - last > gap) {
        if (keep()) break;
        first = -1;
        ink = 0;
      }
      if (first < 0) first = x;
      last = x;
      ink += count;
    }
    if (!keep()) return null;
    for (let y = 0; y < height; y++) {
      mask.fill(0, y * width, y * width + first);
      mask.fill(0, y * width + last + 1, (y + 1) * width);
    }
    return { mode, width, height, pixels: mask };
  };
  let goldCount = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sourceX = Math.floor(x * region.width / width), sourceY = top + y;
    if (sourceX < (target ? action.x + action.width : 0) || sourceY < 0 || sourceY >= region.height) continue;
    const at = (sourceY * region.width + sourceX) * 4, b = region.bgra[at], g = region.bgra[at + 1], r = region.bgra[at + 2];
    if (r > 160 && g > 95 && r > g * 1.05 && g > b * 1.3 && r - b > 60) {
      pixels[y * width + x] = 1;
      goldCount++;
    }
  }
  if (goldCount >= 16) {
    const gold = signature("gold", pixels);
    if (gold) return gold;
  }
  pixels.fill(0);
  let lightCount = 0, darkCount = 0, available = 0;
  const dark = new Uint8Array(pixels.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sourceX = Math.floor(x * region.width / width), sourceY = top + y;
    if (sourceX < action.x + action.width || sourceY < 0 || sourceY >= region.height) continue;
    const at = (sourceY * region.width + sourceX) * 4;
    available++;
    if (Math.min(region.bgra[at], region.bgra[at + 1], region.bgra[at + 2]) >= 200) {
      pixels[y * width + x] = 1;
      lightCount++;
    }
    if (Math.max(region.bgra[at], region.bgra[at + 1], region.bgra[at + 2]) <= 80) {
      dark[y * width + x] = 1;
      darkCount++;
    }
  }
  if (lightCount > available * 0.6) return darkCount >= 16 ? signature("dark", dark) : null;
  return lightCount >= 16 ? signature("light", pixels) : null;
}
function covered(a, b, offsetY = 0) {
  let count = 0, overlap = 0;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    if (!a.pixels[y * a.width + x]) continue;
    count++;
    let found = false;
    for (let row = Math.max(0, y + offsetY - 1); row <= Math.min(b.height - 1, y + offsetY + 1) && !found; row++) {
      for (let column = Math.max(0, x - 1); column <= Math.min(b.width - 1, x + 1); column++) if (b.pixels[row * b.width + column]) {
        found = true;
        break;
      }
    }
    if (found) overlap++;
  }
  return count ? overlap / count : 0;
}
function samePersonalSignature(a, b) {
  if (!a || !b) return a === b;
  if (a.mode !== b.mode || a.width !== b.width || a.height !== b.height) return false;
  const span = (signature) => {
    let first = signature.width, last = -1;
    for (let x = 0; x < signature.width; x++) {
      let count = 0;
      for (let y = 0; y < signature.height && count < 2; y++) count += signature.pixels[y * signature.width + x];
      if (count >= 2) {
        first = Math.min(first, x);
        last = x;
      }
    }
    return Math.max(0, last - first + 1);
  };
  const aSpan = span(a), bSpan = span(b);
  const similarSpan = aSpan > 0 && bSpan > 0 && Math.min(aSpan, bSpan) / Math.max(aSpan, bSpan) >= PERSONAL_NOTIFICATION_LIMITS.minSpanRatio;
  for (let shift = 0; shift <= PERSONAL_NOTIFICATION_LIMITS.maxBaselineShift; shift++) for (const offset of shift ? [-shift, shift] : [0]) {
    const forward = covered(a, b, offset), reverse = covered(b, a, -offset);
    if (Math.min(forward, reverse) >= PERSONAL_NOTIFICATION_LIMITS.coverage || Math.max(forward, reverse) >= PERSONAL_NOTIFICATION_LIMITS.coverage && similarSpan) return true;
  }
  return false;
}

// src/personal-attribution.ts
var import_jpeg_js = __toESM(require_jpeg_js(), 1);

// src/text.ts
var stripWhitespace = (text) => text.replace(/\s+/gu, "");
function compact(text) {
  return stripWhitespace(text.normalize("NFKC"));
}
function compactUpper(text) {
  return compact(text).toLocaleUpperCase("en-US");
}
function compactLower(text) {
  return compact(text).toLowerCase();
}
function upperNFKC(text) {
  return text.normalize("NFKC").toUpperCase();
}

// src/personal-attribution.ts
var PERSONAL_ATTRIBUTION_ROI = { x: 0, y: 0.82, width: 1, height: 0.18 };
var PERSONAL_ATTRIBUTION_LIMITS = { scale: 2, maxPixels: DELTA_MAX_ROI_PIXELS, footerStart: 0.6 };
function hasSpectatorFrame(image) {
  const luma = (x, y2) => {
    const at = (Math.max(0, Math.min(image.height - 1, y2)) * image.width + Math.max(0, Math.min(image.width - 1, x))) * 4;
    return Math.min(image.data[at], image.data[at + 1], image.data[at + 2]);
  };
  const vertical = (x) => {
    let hit2 = 0, total2 = 0;
    for (let y2 = Math.round(image.height * 0.08); y2 < image.height * 0.89; y2 += 2) {
      total2++;
      if (Math.max(luma(x - 1, y2), luma(x, y2), luma(x + 1, y2)) - Math.min(luma(x - 5, y2), luma(x + 5, y2)) >= 40) hit2++;
    }
    return hit2 / total2;
  };
  let hit = 0, total = 0;
  const y = Math.round(image.height * 0.925);
  for (let x = Math.round(image.width * 0.02); x < image.width * 0.98; x += 2) {
    total++;
    if (Math.max(luma(x, y - 1), luma(x, y), luma(x, y + 1)) - Math.min(luma(x, y - 5), luma(x, y + 5)) >= 40) hit++;
  }
  return hit / total >= 0.85 && vertical(Math.round(image.width * 0.011)) >= 0.85 && vertical(Math.round(image.width * 0.989)) >= 0.85;
}
function personalAttributionRegion(evidence) {
  const { frame } = evidence.capture, bounds = captureRectangle(PERSONAL_ATTRIBUTION_ROI, frame.width, frame.height);
  const width = bounds.width * PERSONAL_ATTRIBUTION_LIMITS.scale, height = bounds.height * PERSONAL_ATTRIBUTION_LIMITS.scale;
  if (width * height > PERSONAL_ATTRIBUTION_LIMITS.maxPixels) return null;
  const decoded = import_jpeg_js.default.decode(evidence.capture.jpeg, { useTArray: true });
  if (decoded.width !== frame.width || decoded.height !== frame.height) return null;
  const bgra = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const source2 = ((bounds.y + Math.floor(y / 2)) * decoded.width + bounds.x + Math.floor(x / 2)) * 4, at = (y * width + x) * 4;
    bgra[at] = decoded.data[source2 + 2];
    bgra[at + 1] = decoded.data[source2 + 1];
    bgra[at + 2] = decoded.data[source2];
    bgra[at + 3] = 255;
  }
  return {
    display: evidence.region.display,
    topologyRevision: frame.topologyRevision,
    capturedAt: frame.capturedAt,
    width,
    height,
    bgra,
    spectatorFrame: hasSpectatorFrame(decoded)
  };
}
function parsePersonalAttribution(layout, nickname, spectatorFrame = false) {
  if (layout.truncated || !layout.lines.some((line) => line.text.trim())) return "unknown";
  const footer = layout.lines.filter((line) => line.box.y + line.box.height / 2 >= layout.height * PERSONAL_ATTRIBUTION_LIMITS.footerStart).map((line) => compactUpper(line.text)).join(" ");
  const controls = [/切换观战(?:对象)?|SWITCHSPECTAT/u, /观战名片|SPECTATORCARD/u, /退出观战|EXITSPECTAT/u];
  if (controls.filter((control) => control.test(footer)).length >= 2) return "other";
  const controller = layout.lines.filter((line) => line.box.x >= layout.width * 0.38 && line.box.x + line.box.width <= layout.width * 0.62 && line.box.y + line.box.height / 2 >= layout.height * 0.1 && line.box.y + line.box.height / 2 <= layout.height * 0.4).sort((a, b) => a.box.x - b.box.x).map((line) => compactUpper(line.text)).join("");
  const waiting = layout.lines.some((line) => line.box.x + line.box.width <= layout.width * 0.25 && line.box.y + line.box.height / 2 >= layout.height * PERSONAL_ATTRIBUTION_LIMITS.footerStart && /等待救援/u.test(compactUpper(line.text)));
  return spectatorFrame && waiting && /[\p{L}]/u.test(controller) && controller !== compactUpper(nickname) ? "other" : "own";
}

// src/detector.ts
function parseDetection(lines, nickname, language) {
  const name = compactUpper(nickname);
  if (!name || !language) return null;
  const pattern = language === "en-US" ? /^(.+?)(?:\s+|\s*[:：]\s*)(KNOCKED\s+DOWN|KILLED)\s+(.+)$/iu : /^(.+?)(?:\s+|\s*[:：]\s*)(击\s*倒|击\s*杀)\s+(.+)$/u;
  const matches = /* @__PURE__ */ new Map();
  for (const text of lines) {
    const normalized2 = text.normalize("NFKC").trim(), match = pattern.exec(normalized2);
    if (!match || compactUpper(match[1]) !== name) continue;
    const target = compactUpper(match[3]);
    if (!target || /\b(?:KILLED|KNOCKED\s+DOWN)\b/iu.test(match[3]) || /击倒|击杀/u.test(match[3])) continue;
    const verb = compactUpper(match[2]), kind = verb === "KNOCKEDDOWN" || verb === "\u51FB\u5012" ? "knockdown" : "kill";
    const key = createHash("sha256").update(`${kind}:${name}:${target}`).digest("hex");
    matches.set(key, { kind, text, dedupKey: key, attribution: { relation: "self", basis: "actor-text", assisted: false, spectating: false }, recognition: {
      kind: "actor-text",
      text,
      actor: compact(match[1]),
      target: compact(match[3])
    } });
  }
  return matches.size === 1 ? [...matches.values()][0] : null;
}
function sameBaseline(a, b) {
  const height = Math.max(a.height, b.height), overlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return Math.min(a.height, b.height) >= height / 2 && overlap >= Math.min(a.height, b.height) * 0.6 && Math.abs(a.y + a.height / 2 - b.y - b.height / 2) <= height * 0.35;
}
function joinedTextAt(words, boundary) {
  let offset = 0;
  for (const [index, word] of words.entries()) {
    offset += compactUpper(word.text).length;
    if (offset > boundary) return true;
    if (offset === boundary) {
      const next = words[index + 1]?.box;
      return !!next && next.x - (word.box.x + word.box.width) <= Math.min(word.box.height, next.height) * 0.25;
    }
  }
  return false;
}
function personalFeedbackRows(layout) {
  const words = layout.lines.flatMap((line) => line.words);
  return words.filter((word) => compactUpper(word.text).includes("\u51FB")).map((anchor) => {
    const row = words.filter((word) => sameBaseline(anchor.box, word.box)).sort((a, b) => a.box.x - b.box.x);
    const text = row.map((word) => word.text).join(" "), normalized2 = compactUpper(text), actions = [...normalized2.matchAll(/击倒|击败/gu)];
    const action = actions.length === 1 ? actions[0] : null;
    const prefix = normalized2.slice(0, action?.index ?? normalized2.indexOf("\u51FB"));
    const end = action ? action.index + action[0].length : 0;
    const settingsLabel = !!action && (/(?:[与和或及]|[杀倒败][、/]|启用|监测|配置|识别|回应|统计)$/u.test(prefix) || !prefix && normalized2.slice(end) === "\u8BC6\u522B" && joinedTextAt(row, end));
    return { row, anchor, text, normalized: normalized2, action, settingsLabel, assisted: /协|助/u.test(prefix) };
  });
}
function attributePersonalFeedback(matches, layouts, view = "own") {
  const rows = layouts.filter((layout) => !layout.truncated).flatMap(personalFeedbackRows);
  const assisted = rows.filter((row) => row.assisted && !row.settingsLabel).map((row) => row.anchor.box);
  const captions = rows.filter((row) => row.settingsLabel);
  const candidates = matches.filter((match) => !match.personalAction || !captions.some((row) => sameBaseline(row.anchor.box, match.personalAction)));
  return candidates.map((match) => {
    if (match.recognition.kind !== "personal-feedback-text") return match;
    const uncertain = view === "unknown" || layouts.some((layout) => layout.truncated) || match.attribution.relation === "unknown";
    const assist = match.attribution.assisted || !!match.personalAction && assisted.some((box) => sameBaseline(box, match.personalAction));
    const spectating = view === "other";
    const attribution = {
      relation: spectating || assist ? "teammate" : uncertain ? "unknown" : "self",
      basis: spectating ? "spectator-hud" : assist ? "assist-text" : uncertain ? "unknown" : "personal-feedback",
      assisted: assist,
      spectating
    };
    return { ...match, attribution };
  });
}
function parsePersonalFeedback(layout, nickname) {
  if (layout.truncated || !nickname.trim()) return [];
  const matches = /* @__PURE__ */ new Map();
  for (const { row, text, normalized: normalized2, action, assisted, settingsLabel } of personalFeedbackRows(layout)) {
    if (!action || settingsLabel) continue;
    const kind = action[0] === "\u51FB\u5012" ? "knockdown" : "kill", target = normalized2.slice(action.index + action[0].length);
    let offset = 0;
    const boxes = [], targetBoxes = [];
    for (const word of row) {
      const length = compactUpper(word.text).length, start2 = Math.max(offset, action.index), end = Math.min(offset + length, action.index + action[0].length);
      if (end > start2) boxes.push({ ...word.box, x: word.box.x + word.box.width * (start2 - offset) / length, width: word.box.width * (end - start2) / length });
      const targetStart = Math.max(offset, action.index + action[0].length);
      if (offset + length > targetStart) targetBoxes.push({
        ...word.box,
        x: word.box.x + word.box.width * (targetStart - offset) / length,
        width: word.box.width * (offset + length - targetStart) / length
      });
      offset += length;
    }
    const x = Math.min(...boxes.map((box) => box.x)), last = boxes[boxes.length - 1];
    const personalAction = { x, y: last.y, width: Math.max(...boxes.map((box) => box.x + box.width)) - x, height: last.height };
    const personalTarget = targetBoxes.length ? unionRects(targetBoxes) : void 0;
    const key = createHash("sha256").update(`${kind}:${compactUpper(nickname)}:${assisted ? "teammate" : "self"}:${target}`).digest("hex");
    matches.set(key, {
      kind,
      text,
      dedupKey: key,
      personalAction,
      ...personalTarget ? { personalTarget } : {},
      attribution: { relation: assisted ? "teammate" : "self", basis: assisted ? "assist-text" : "personal-feedback", assisted, spectating: false },
      recognition: { kind: "personal-feedback-text", text, target }
    });
    if (matches.size >= 8) break;
  }
  return [...matches.values()];
}
function matchesCalibration(region, calibration) {
  return region.topologyRevision === calibration.topologyRevision && sameDeltaDisplay(region.display, calibration.display);
}
function detectionStatus(config) {
  const calibration = config.calibration;
  const reason = !config.nickname.trim() ? "nickname-required" : !config.language ? "language-required" : !calibration ? "calibration-required" : !calibrationFitsBudget(calibration) ? "roi-too-large" : calibration.personalFeedbackRoi && config.language !== "zh-CN" ? "feedback-language-unsupported" : null;
  return {
    phase: !config.enabled ? "disabled" : reason === "feedback-language-unsupported" ? "unavailable" : reason ? "uncalibrated" : "starting",
    reason: config.enabled ? reason : null,
    engine: null,
    availableLanguages: [],
    scans: 0,
    candidates: 0,
    confirmed: 0,
    lastError: null
  };
}
function fingerprint(region) {
  const width = 96, height = 32, result = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = (Math.min(region.height - 1, Math.floor(y * region.height / height)) * region.width + Math.min(region.width - 1, Math.floor(x * region.width / width))) * 4;
    result[y * width + x] = (region.bgra[at] + region.bgra[at + 1] * 2 + region.bgra[at + 2]) / 4;
  }
  return result;
}
var Detector = class {
  constructor(config, evidence, confirmed, openOcr = createOcr, backoffMs = deltaOcrBackoffMs) {
    this.config = config;
    this.evidence = evidence;
    this.confirmed = confirmed;
    this.openOcr = openOcr;
    this.backoffMs = backoffMs;
    this.status = detectionStatus(config);
  }
  config;
  evidence;
  confirmed;
  openOcr;
  backoffMs;
  status;
  ocr = null;
  pending = null;
  running = null;
  closed = false;
  previous = null;
  lastScanAtMs = 0;
  failures = 0;
  inflight = null;
  backoffCancel = null;
  submit(region) {
    if (this.closed || !this.config.enabled || !this.config.nickname.trim() || !this.config.language || !this.config.calibration || this.status.reason === "roi-too-large" || this.status.reason === "feedback-language-unsupported") return;
    if (!matchesCalibration(region, this.config.calibration)) {
      this.status.phase = "uncalibrated";
      this.status.reason = "source-changed";
      this.pending = null;
      this.previous = null;
      this.backoffCancel?.();
      void this.ocr?.close();
      return;
    }
    if (this.status.reason === "source-changed" || this.status.phase === "error" || this.status.phase === "unavailable") return;
    this.pending = region;
    if (!this.running) {
      this.running = this.drain().finally(() => {
        this.running = null;
      });
    }
  }
  async drain() {
    while (!this.closed && this.status.phase !== "error" && this.status.phase !== "unavailable" && this.status.reason !== "source-changed") {
      try {
        await this.scan();
        return;
      } catch (error) {
        if (this.recognitionStopped()) return;
        if (ocrUnavailableOnPlatform(error)) {
          this.status.phase = "unavailable";
          this.status.reason = "ocr-unavailable";
          this.status.lastError = String(error);
          this.pending = null;
          this.inflight = null;
          return;
        }
        if (!await this.noteTransient(error)) return;
      }
    }
  }
  async scan() {
    try {
      if (!this.ocr) {
        this.ocr = await this.openOcr(this.config.language);
        if (this.closed || this.status.reason === "source-changed") {
          await this.ocr.close();
          return;
        }
        this.status.engine = "windows-ocr";
        this.status.availableLanguages = this.ocr.availableLanguages;
        if (!this.ocr.language) {
          this.status.phase = "unavailable";
          this.status.reason = "ocr-language-unavailable";
          this.pending = null;
          await this.ocr.close();
          return;
        }
      }
      while (this.pending && !this.closed) {
        const region = this.pending;
        this.pending = null;
        const wait = 500 - (Date.now() - this.lastScanAtMs);
        if (wait > 0) {
          this.pending = region;
          await this.waitBackoff(wait);
          continue;
        }
        const next = fingerprint(region);
        let difference = this.previous ? 0 : Infinity;
        if (this.previous) for (let i = 0; i < next.length; i++) difference += Math.abs(next[i] - this.previous[i]);
        if (difference / next.length < 1.5) continue;
        this.previous = next;
        this.lastScanAtMs = Date.now();
        this.inflight = region;
        const initial = await this.recognize(region);
        this.inflight = null;
        if (this.closed || this.status.reason === "source-changed") return;
        this.status.scans++;
        this.status.phase = "ready";
        this.status.reason = null;
        if (!initial.length) continue;
        this.status.candidates += initial.length;
        const evidence = await this.evidence();
        if (this.closed || !matchesCalibration(evidence.region, this.config.calibration)) {
          this.status.phase = "uncalibrated";
          this.status.reason = "source-changed";
          await this.ocr?.close();
          return;
        }
        let checked = await this.recognize(evidence.region, true);
        if (this.closed || this.status.reason === "source-changed") return;
        if (!checked.length) continue;
        if (checked.some((match) => match.recognition.kind === "personal-feedback-text")) {
          const attribution = personalAttributionRegion(evidence);
          const view = attribution ? parsePersonalAttribution(await this.ocr.recognizeLayout(attribution), this.config.nickname, attribution.spectatorFrame) : "unknown";
          if (this.recognitionStopped()) return;
          checked = attributePersonalFeedback(checked, [], view);
        }
        for (const match of checked) {
          const index = initial.findIndex((candidate) => candidate.kind === match.kind && (match.recognition.kind === "personal-feedback-text" ? samePersonalSignature(candidate.personalSignature ?? null, match.personalSignature ?? null) : candidate.dedupKey === match.dedupKey));
          if (index < 0) continue;
          initial.splice(index, 1);
          this.status.confirmed++;
          this.confirmed(evidence, match);
        }
      }
    } catch (error) {
      if (this.inflight && !this.pending) this.pending = this.inflight;
      throw error;
    }
  }
  async noteTransient(error) {
    const port = this.ocr;
    this.ocr = null;
    this.previous = null;
    this.inflight = null;
    this.failures++;
    this.status.lastError = String(error);
    const retry = this.failures < DELTA_OCR_TRANSIENT_FAILURE_LIMIT;
    if (retry) {
      this.status.phase = "starting";
      this.status.reason = null;
    } else {
      this.status.phase = "error";
      this.status.reason = null;
      this.pending = null;
    }
    await port?.close();
    if (this.recognitionStopped() || !retry) return false;
    await this.waitBackoff(this.backoffMs(this.failures));
    return !this.recognitionStopped();
  }
  waitBackoff(ms) {
    if (this.closed || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.backoffCancel = null;
        resolve();
      }, ms);
      this.backoffCancel = () => {
        clearTimeout(timer);
        this.backoffCancel = null;
        resolve();
      };
    });
  }
  async recognize(region, verify = false) {
    if (this.recognitionStopped()) return [];
    const layout = await this.ocr.recognizeLayout(region);
    this.failures = 0;
    this.status.lastError = null;
    const raw = this.matches(layout);
    const finish = (matches2) => matches2.map((match) => match.personalAction ? { ...match, personalSignature: createPersonalSignature(region, match.personalAction, match.personalTarget) } : match);
    if (!this.config.calibration?.personalFeedbackRoi || this.config.language !== "zh-CN") return finish(raw);
    const layouts = [layout], matches = raw;
    const classified = () => attributePersonalFeedback(matches, layouts);
    if (!verify && raw.length) return finish(classified());
    let pixels = 0;
    for (const kind of PERSONAL_TEXT_FALLBACKS) {
      if (this.recognitionStopped()) return [];
      const raster = personalTextRaster(region, kind);
      if (!raster) continue;
      pixels += raster.region.width * raster.region.height;
      if (pixels > PERSONAL_TEXT_FALLBACK_LIMITS.maxTotalPixels || pixels + region.width * region.height > PERSONAL_TEXT_FALLBACK_LIMITS.maxScanPixels) break;
      const layout2 = await this.ocr.recognizeLayout(raster.region);
      if (this.recognitionStopped()) return [];
      const restored = restorePersonalLayout(layout2, raster);
      layouts.push(restored);
      for (const match of this.matches(restored)) if (match.recognition.kind === "personal-feedback-text" && !matches.some((candidate) => candidate.personalAction && match.personalAction && sameBaseline(candidate.personalAction, match.personalAction))) {
        matches.push({ ...match, recognition: { ...match.recognition, preprocessing: kind } });
      }
      if (!verify && matches.length) return finish(classified());
    }
    return finish(classified());
  }
  recognitionStopped() {
    return this.closed || this.status.reason === "source-changed";
  }
  matches(layout) {
    if (layout.truncated) return [];
    if (this.config.calibration?.personalFeedbackRoi) return parsePersonalFeedback(layout, this.config.nickname);
    const result = /* @__PURE__ */ new Map();
    for (const line of layout.lines) {
      const match = parseDetection([line.text], this.config.nickname, this.config.language);
      if (match) result.set(match.dedupKey, match);
      if (result.size >= 8) break;
    }
    return [...result.values()];
  }
  async close() {
    this.closed = true;
    this.pending = null;
    this.backoffCancel?.();
    await this.ocr?.close();
    await this.running;
  }
};

// src/loot-detector.ts
var import_jpeg_js2 = __toESM(require_jpeg_js(), 1);
import { createHash as createHash2 } from "node:crypto";

// src/image.ts
function copyPixelRect(source2, sourceWidth, x, y, width, height) {
  const target = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    const start2 = ((y + row) * sourceWidth + x) * 4;
    target.set(source2.subarray(start2, start2 + width * 4), row * width * 4);
  }
  return target;
}

// src/loot-detector.ts
function lootCaptureRoi(calibration) {
  return unionRect(calibration.itemsRoi, calibration.contextRoi);
}
function lootStatus(config, combat) {
  const reason = !config.language ? "language-required" : !config.calibration ? "calibration-required" : !lootCalibrationFitsBudget(config.calibration) ? "roi-too-large" : combat?.enabled && combat.language && combat.language !== config.language ? "language-conflict" : null;
  return {
    phase: !config.enabled ? "disabled" : reason === "language-conflict" ? "unavailable" : reason ? "uncalibrated" : "starting",
    reason: config.enabled ? reason : null,
    engine: null,
    availableLanguages: [],
    scans: 0,
    candidates: 0,
    scene: null,
    lastError: null
  };
}
function parseLootContext(layout) {
  if (layout.truncated) return null;
  const text = upperNFKC(layout.lines.map((line) => line.text).join(" "));
  const folded = stripWhitespace(text), contains2 = (pattern) => pattern.test(text) || pattern.test(folded);
  const classes = [/背包|\bBACKPACK\b/u, /胸挂|\bRIG\b/u, /保险箱|安全箱|\bSAFE\b|\bSECURE\b/u, /装备|\bEQUIPMENT\b/u].filter(contains2).length;
  if (!classes) return null;
  if (contains2(/容器|搜索物资|\bCONTAINER\b/u)) return "container";
  if (contains2(/战利品|搜索|搜刮|\bLOOT\b|\bSEARCH\b/u)) return "loot";
  const capacityHeading = layout.lines.some((line) => {
    const match = /^(?:安全箱|保险箱):?(\d{1,3})\/(\d{1,3})(?![\d/])/u.exec(compact(line.text));
    return match && Number(match[2]) > 0 && Number(match[1]) <= Number(match[2]);
  });
  if (capacityHeading) return "inventory";
  return classes >= 2 ? "inventory" : null;
}
function sameLootSignature(a, b) {
  if (a.length !== 768 || b.length !== 768) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference += Math.abs(a[i] - b[i]);
  return difference / a.length <= 12;
}
function itemCandidate(region, box) {
  const signature = new Uint8Array(768);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const sx = Math.min(region.width - 1, Math.floor(box.x + box.width * (0.1 + (x + 0.5) / 20)));
    const sy = Math.min(region.height - 1, Math.floor(box.y + box.height * (0.1 + (y + 0.5) / 20))), at = (sy * region.width + sx) * 4;
    for (let channel = 0; channel < 3; channel++) signature[(y * 16 + x) * 3 + channel] = Math.floor(region.bgra[at + channel] / 16) * 16;
  }
  return { box, signature };
}
function hasCardBorder(region, box, scale) {
  for (let side = 0; side < 4; side++) {
    let best = 0;
    const horizontal = side < 2, length = horizontal ? box.width : box.height;
    for (let offset = -Math.ceil(scale * 2); offset <= Math.ceil(scale * 2); offset++) {
      let count = 0, samples = 0;
      for (let along = 0; along <= length; along += Math.max(1, scale / 2)) {
        const x = Math.floor(box.x + (horizontal ? along : side === 2 ? offset : box.width + offset));
        const y = Math.floor(box.y + (horizontal ? side === 0 ? offset : box.height + offset : along));
        samples++;
        if (x < 0 || y < 0 || x >= region.width || y >= region.height) continue;
        const at = (y * region.width + x) * 4, b = region.bgra[at], g = region.bgra[at + 1], r = region.bgra[at + 2];
        const high = Math.max(r, g, b), low = Math.min(r, g, b);
        if (low >= 45 && high <= 200 && high - low <= 22) count++;
      }
      best = Math.max(best, count / samples);
      if (best >= 0.65) break;
    }
    if (best < 0.65) return false;
  }
  return true;
}
function mergedCardFallback(region, mask, width, height, scale, minimum, result) {
  const visited = new Uint8Array(mask.length), queue = new Int32Array(mask.length);
  for (let start2 = 0; start2 < mask.length; start2++) {
    if (!mask[start2] || visited[start2]) continue;
    let size = 1, left = width, right = 0, top = height, bottom = 0;
    queue[0] = start2;
    visited[start2] = 1;
    for (let index = 0; index < size; index++) {
      const at = queue[index], x = at % width, y = Math.floor(at / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * width + nx;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[next] && !visited[next]) {
          visited[next] = 1;
          queue[size++] = next;
        }
      }
    }
    const w = right - left + 1, h = bottom - top + 1;
    if (w < 8 || h < 8 || w / h < 0.5 || w / h > 2 || size / (w * h) < Math.max(0.2, minimum)) continue;
    const edges = [0, 0, 0, 0];
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) if (mask[y * width + x]) {
      if (y < top + 2) edges[0]++;
      if (y > bottom - 2) edges[1]++;
      if (x < left + 2) edges[2]++;
      if (x > right - 2) edges[3]++;
    }
    if (edges.some((count, side) => count < (side < 2 ? w : h) * 2 * 0.55)) continue;
    const box = {
      x: Math.floor(left * scale),
      y: Math.floor(top * scale),
      width: Math.min(region.width, Math.ceil((right + 1) * scale)) - Math.floor(left * scale),
      height: Math.min(region.height, Math.ceil((bottom + 1) * scale)) - Math.floor(top * scale)
    };
    if (result.some(({ box: prior }) => {
      const overlap = Math.max(0, Math.min(box.x + box.width, prior.x + prior.width) - Math.max(box.x, prior.x)) * Math.max(0, Math.min(box.y + box.height, prior.y + prior.height) - Math.max(box.y, prior.y));
      return overlap >= Math.min(box.width * box.height, prior.width * prior.height) * 0.8;
    }) || !hasCardBorder(region, box, scale)) continue;
    result.push(itemCandidate(region, box));
    if (result.length >= DELTA_MAX_LOOT_CANDIDATES) return;
  }
}
function detectLootItems(region, sensitivity) {
  const scale = Math.max(1, region.width / 320, region.height / 240), width = Math.max(1, Math.floor(region.width / scale)), height = Math.max(1, Math.floor(region.height / scale));
  const columns = new Uint16Array(width), rows = new Uint16Array(height), red = new Uint8Array(width * height), backing = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = (Math.min(region.height - 1, Math.floor(y * scale)) * region.width + Math.min(region.width - 1, Math.floor(x * scale))) * 4;
    const b = region.bgra[at], g = region.bgra[at + 1], r = region.bgra[at + 2], high = Math.max(r, g, b), low = Math.min(r, g, b);
    if (high - low <= 40 && low >= 65 && high <= 230) {
      columns[x]++;
      rows[y]++;
    }
    if (r >= 110 && g <= r * 0.55 && b <= r * 0.7 && r - Math.max(g, b) >= 50) red[y * width + x] = 1;
    if (r >= 45 && g <= r * 0.75 && b >= g * 0.8 && b <= r * 0.85 && r - g >= 14 && r - b >= 10) backing[y * width + x] = 1;
  }
  const lines = (counts, threshold) => {
    const result2 = [];
    let first = -1;
    for (let i = 0; i <= counts.length; i++) {
      if (i < counts.length && counts[i] >= threshold) {
        if (first < 0) first = i;
      } else if (first >= 0) {
        result2.push(Math.round((first + i - 1) / 2));
        first = -1;
      }
    }
    return result2;
  };
  const vertical = lines(columns, height * 0.4), horizontal = lines(rows, width * 0.4);
  const minimum = { conservative: 0.35, balanced: 0.22, sensitive: 0.12 }[sensitivity], result = [];
  if (vertical.length >= 3 && horizontal.length >= 3) for (let row = 0; row < horizontal.length - 1; row++) for (let column = 0; column < vertical.length - 1; column++) {
    const left = vertical[column] + 1, top = horizontal[row] + 1, right = vertical[column + 1], bottom = horizontal[row + 1];
    const w = right - left, h = bottom - top;
    if (w < 8 || h < 8 || w / h < 0.5 || w / h > 2) continue;
    let count = 0;
    const edges = [0, 0, 0, 0];
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (red[y * width + x]) {
      count++;
      if (y < top + 3) edges[0]++;
      if (y >= bottom - 3) edges[1]++;
      if (x < left + 3) edges[2]++;
      if (x >= right - 3) edges[3]++;
    }
    const markedSides = edges.filter((n, i) => n >= (i < 2 ? w : h) * 1.5).length;
    if (count / (w * h) < minimum && !(count / (w * h) >= 0.06 && markedSides >= 3)) continue;
    const box = {
      x: Math.floor(left * scale),
      y: Math.floor(top * scale),
      width: Math.min(region.width, Math.ceil(right * scale)) - Math.floor(left * scale),
      height: Math.min(region.height, Math.ceil(bottom * scale)) - Math.floor(top * scale)
    };
    result.push(itemCandidate(region, box));
    if (result.length >= DELTA_MAX_LOOT_CANDIDATES) return result;
  }
  mergedCardFallback(region, backing, width, height, scale, minimum, result);
  return result;
}
var LootItemTracker = class {
  references = [];
  clear() {
    this.references = [];
  }
  find(namespace, signature, now) {
    this.references = this.references.filter((reference) => reference.expiresAtMs > now);
    return this.references.find((reference) => reference.namespace === namespace && sameLootSignature(reference.signature, signature));
  }
  observe(namespace, signatures, now) {
    for (const signature of signatures) {
      const reference = this.find(namespace, signature, now);
      if (reference) reference.expiresAtMs = now + DELTA_LOOT_RETAIN_MS;
    }
    this.references = this.references.filter((reference) => reference.expiresAtMs > now);
  }
  has(namespace, signature, now) {
    return !!this.find(namespace, signature, now);
  }
  identify(namespace, signature, now) {
    return this.find(namespace, signature, now)?.key ?? createHash2("sha256").update(`${namespace}:${now}:`).update(signature).digest("hex");
  }
  remember(namespace, signature, key, now) {
    const reference = this.find(namespace, signature, now);
    if (reference) {
      reference.expiresAtMs = now + DELTA_LOOT_RETAIN_MS;
      return;
    }
    this.references.push({ namespace, signature: new Uint8Array(signature), key, expiresAtMs: now + DELTA_LOOT_RETAIN_MS });
    while (this.references.length > DELTA_MAX_LOOT_REFERENCES) this.references.shift();
  }
};
function lootNamespace(region, calibration) {
  return JSON.stringify([region.display, region.topologyRevision, calibration]);
}
function evidenceRegions(evidence, calibration) {
  const { width, height } = calibration.display.bounds, union = captureRectangle(lootCaptureRoi(calibration), width, height);
  const extract = (roi) => {
    const box = captureRectangle(roi, width, height);
    if (evidence.region.width !== union.width || evidence.region.height !== union.height) throw new Error("Invalid native item evidence dimensions");
    const data = copyPixelRect(evidence.region.bgra, union.width, box.x - union.x, box.y - union.y, box.width, box.height);
    return { ...evidence.region, width: box.width, height: box.height, bgra: data };
  };
  const decoded = import_jpeg_js2.default.decode(evidence.capture.jpeg, { useTArray: true, maxMemoryUsageInMB: 32, maxResolutionInMP: 4 });
  const crop = captureRectangle(calibration.itemsRoi, decoded.width, decoded.height);
  const rgba = copyPixelRect(decoded.data, decoded.width, crop.x, crop.y, crop.width, crop.height);
  return { items: {
    capture: evidence.capture,
    region: extract(calibration.itemsRoi),
    crop,
    cropJpeg: import_jpeg_js2.default.encode({ data: rgba, width: crop.width, height: crop.height }, 90).data
  }, context: extract(calibration.contextRoi) };
}
var LootDetector = class {
  constructor(config, evidence, candidate, openOcr = createOcr, combat, backoffMs = deltaOcrBackoffMs, sampleIntervalMs = DELTA_LOOT_SAMPLE_INTERVAL_MS) {
    this.config = config;
    this.evidence = evidence;
    this.candidate = candidate;
    this.openOcr = openOcr;
    this.backoffMs = backoffMs;
    this.sampleIntervalMs = sampleIntervalMs;
    this.status = lootStatus(config, combat);
  }
  config;
  evidence;
  candidate;
  openOcr;
  backoffMs;
  sampleIntervalMs;
  status;
  visible = [];
  pending = null;
  running = null;
  closed = false;
  previous = [];
  tracker = new LootItemTracker();
  ocr = null;
  lastScanAtMs = 0;
  failures = 0;
  backoffCancel = null;
  submit(region) {
    if (this.closed || !this.config.enabled || !this.config.calibration || this.status.phase === "unavailable" || this.status.phase === "error" || this.status.reason) return;
    if (!matchesCalibration(region, { ...this.config.calibration, roi: this.config.calibration.itemsRoi })) {
      this.status.phase = "uncalibrated";
      this.status.reason = "source-changed";
      this.clearVisible();
      this.backoffCancel?.();
      void this.ocr?.close();
      return;
    }
    this.pending = region;
    if (!this.running) this.running = this.drain().finally(() => {
      this.running = null;
    });
  }
  clearVisible() {
    this.visible = [];
    this.previous = [];
    this.pending = null;
    this.status.scene = null;
  }
  async drain() {
    while (!this.recognitionStopped() && this.status.phase !== "error" && this.status.phase !== "unavailable") {
      try {
        await this.scan();
        return;
      } catch (error) {
        if (this.recognitionStopped()) return;
        if (ocrUnavailableOnPlatform(error)) {
          this.status.phase = "unavailable";
          this.status.reason = "ocr-unavailable";
          this.status.lastError = String(error);
          this.clearVisible();
          return;
        }
        if (!await this.noteTransient(error)) return;
      }
    }
  }
  async scan() {
    while (this.pending && !this.closed) {
      const wait = this.sampleIntervalMs - (Date.now() - this.lastScanAtMs);
      if (wait > 0) {
        await this.waitBackoff(wait);
        continue;
      }
      const region = this.pending;
      this.pending = null;
      this.lastScanAtMs = Date.now();
      try {
        const candidates = detectLootItems(region, this.config.sensitivity), now = Date.now(), calibration = this.config.calibration;
        const namespace = lootNamespace(region, calibration);
        this.visible = candidates.map((item) => item.signature);
        this.tracker.observe(namespace, this.visible, now);
        this.status.scans++;
        this.status.phase = "ready";
        const stable = candidates.filter((item) => this.previous.some((prior) => sameLootSignature(prior.signature, item.signature)) && !this.tracker.has(namespace, item.signature, now));
        this.previous = candidates;
        if (!candidates.length) this.status.scene = null;
        if (!stable.length) continue;
        const evidence = await this.evidence();
        if (this.recognitionStopped()) {
          await this.ocr?.close();
          return;
        }
        if (!matchesCalibration(evidence.region, { ...calibration, roi: calibration.itemsRoi })) {
          this.status.phase = "uncalibrated";
          this.status.reason = "source-changed";
          this.clearVisible();
          await this.ocr?.close();
          return;
        }
        const parts = evidenceRegions(evidence, calibration), checked = detectLootItems(parts.items.region, this.config.sensitivity);
        const matches = checked.filter((item) => stable.some((prior) => sameLootSignature(prior.signature, item.signature)));
        if (!matches.length) continue;
        if (!this.ocr) this.ocr = await this.openOcr(this.config.language);
        if (this.recognitionStopped()) {
          await this.ocr.close();
          return;
        }
        this.status.engine = "windows-ocr";
        this.status.availableLanguages = this.ocr.availableLanguages;
        if (!this.ocr.language) {
          this.status.phase = "unavailable";
          this.status.reason = "ocr-language-unavailable";
          await this.ocr.close();
          return;
        }
        const layout = await this.ocr.recognizeLayout(parts.context);
        this.failures = 0;
        this.status.lastError = null;
        if (this.recognitionStopped()) {
          await this.ocr.close();
          return;
        }
        const scene = parseLootContext(layout);
        this.status.scene = scene;
        if (!scene) continue;
        const text = layout.lines.map((line) => line.text).join(" ").slice(0, 512);
        for (const match of matches) {
          if (this.tracker.has(namespace, match.signature, Date.now())) continue;
          const dedupKey = this.tracker.identify(namespace, match.signature, Date.now());
          this.tracker.remember(namespace, match.signature, dedupKey, Date.now());
          this.status.candidates++;
          this.candidate(parts.items, {
            dedupKey,
            signature: match.signature,
            recognition: { kind: "loot-candidate", text, target: "", scene, basis: "red-grid-ui", quality: "unconfirmed", itemName: null }
          });
        }
      } catch (error) {
        if (!this.pending) this.pending = region;
        throw error;
      }
    }
  }
  async noteTransient(error) {
    const port = this.ocr;
    this.ocr = null;
    this.failures++;
    this.status.lastError = String(error);
    const retry = this.failures < DELTA_OCR_TRANSIENT_FAILURE_LIMIT;
    if (retry) {
      this.status.phase = "starting";
      this.status.reason = null;
    } else {
      this.status.phase = "error";
      this.status.reason = null;
      this.clearVisible();
    }
    await port?.close();
    if (this.recognitionStopped() || !retry) return false;
    await this.waitBackoff(this.backoffMs(this.failures));
    return !this.recognitionStopped();
  }
  waitBackoff(ms) {
    if (this.closed || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.backoffCancel = null;
        resolve();
      }, ms);
      this.backoffCancel = () => {
        clearTimeout(timer);
        this.backoffCancel = null;
        resolve();
      };
    });
  }
  recognitionStopped() {
    return this.closed || this.status.reason === "source-changed";
  }
  async close() {
    this.closed = true;
    this.clearVisible();
    this.backoffCancel?.();
    await this.ocr?.close();
    await this.running;
  }
};

// src/calibration.ts
var WIDTH = 2560;
var HEIGHT = 1440;
var normalized = (x, y, width, height) => ({
  x: x / WIDTH,
  y: y / HEIGHT,
  width: width / WIDTH,
  height: height / HEIGHT
});
var PREPARATION_ROIS = {
  start: normalized(165, 45, 180, 55),
  actions: normalized(1940, 1255, 510, 65)
};
var SOLO_PREPARATION_MODE_ROI = normalized(2285, 1075, 155, 43);
var CALIBRATION_SOURCE_PROBE = { x: 0, y: 0, width: 1e-6, height: 1e-6 };
var PRESET = {
  combat: { roi: normalized(1850, 80, 710, 220), personalFeedbackRoi: normalized(1e3, 1010, 700, 80) },
  loot: { itemsRoi: normalized(980, 1e3, 460, 280), contextRoi: normalized(980, 945, 650, 55) }
};
function supportsPreparation(source2) {
  return source2.display.bounds.width === WIDTH && source2.display.bounds.height === HEIGHT;
}
function sameCalibrationSource(a, b) {
  return a.topologyRevision === b.topologyRevision && sameDeltaDisplay(a.display, b.display);
}

// src/calibration-anchors-grid.ts
function closeGaps(mask, start2, count, stride, gap) {
  let previous = -gap - 2;
  for (let i = 0, index = start2; i < count; i++, index += stride) {
    if (!mask[index]) continue;
    if (i - previous <= gap + 1) {
      for (let between = previous + 1; between < i; between++) mask[start2 + between * stride] = 1;
    }
    previous = i;
  }
}
function edgeMap(frame, crop, textHeight) {
  const { width, height } = crop;
  const size = width * height;
  const horizontal = new Uint8Array(size), vertical = new Uint8Array(size), contrast = new Uint8Array(size);
  const lastRow = new Uint8Array(width);
  const gap = (Math.max(3, Math.round(textHeight * 0.22)) | 1) - 1;
  for (let y = 0; y < height; y++) {
    let previous = 0;
    let source2 = ((crop.y + y) * frame.width + crop.x) * 4;
    for (let x = 0; x < width; x++, source2 += 4) {
      const pixel = frame.bgra[source2] * 29 + frame.bgra[source2 + 1] * 150 + frame.bgra[source2 + 2] * 77 + 128 >> 8;
      const index = y * width + x;
      const delta = y ? Math.abs(pixel - lastRow[x]) : 0;
      contrast[index] = delta;
      horizontal[index] = Number(delta >= 7);
      vertical[index] = Number(x > 0 && Math.abs(pixel - previous) >= 7);
      lastRow[x] = previous = pixel;
    }
    closeGaps(horizontal, y * width, width, 1, gap);
  }
  for (let x = 0; x < width; x++) closeGaps(vertical, x, height, width, gap);
  return { width, height, horizontal, vertical, contrast };
}
function segments(edges, y, left, right, minLength) {
  const result = [];
  let start2 = left;
  const row = y * edges.width;
  for (let x = left; x <= right; x++) {
    if (x < right && edges.horizontal[row + x]) continue;
    if (x - start2 >= minLength) result.push({ left: start2, right: x, y });
    start2 = x + 1;
  }
  return result;
}
function medianContrast(edges, line) {
  const offset = line.y * edges.width;
  const samples = edges.contrast.slice(offset + line.left, offset + line.right).sort();
  return samples[Math.floor(samples.length / 2)];
}
function header(edges, text) {
  const h = text.height;
  const lines = (from, to) => {
    const found = [];
    for (let y = Math.max(1, Math.round(from)); y <= Math.min(edges.height - 1, Math.round(to)); y++) {
      for (const line of segments(edges, y, 0, edges.width, 8 * h)) {
        if (line.left >= text.x - 2.5 * h && line.left <= text.x + 0.25 * h && line.right >= text.x + text.width + 3 * h) found.push(line);
      }
    }
    return found;
  };
  const upper = lines(text.y - 1.35 * h, text.y);
  const lower = lines(text.y + h, text.y + 2.2 * h);
  let best = -Infinity, result;
  for (const top of upper) for (const bottom of lower) {
    const overlap = (Math.min(top.right, bottom.right) - Math.max(top.left, bottom.left)) / (Math.max(top.right, bottom.right) - Math.min(top.left, bottom.left));
    const separation = bottom.y - top.y;
    if (overlap < 0.94 || separation < 1.25 * h || separation > 3 * h) continue;
    const score = 3 * overlap + (medianContrast(edges, top) + medianContrast(edges, bottom)) / 60 - Math.abs(separation - 2 * h) / (3 * h);
    if (score <= best) continue;
    best = score;
    const x = Math.round((top.left + bottom.left) / 2);
    result = { x, y: top.y, width: Math.round((top.right + bottom.right) / 2) - x, height: separation + 1 };
  }
  return result;
}
function sideCoverage(edge, x, start2, end, margin) {
  let covered2 = 0;
  const left = Math.max(0, x - margin), right = Math.min(edge.width - 1, x + margin);
  for (let y = start2; y < end; y++) for (let column = left; column <= right; column++) {
    if (edge.vertical[y * edge.width + column]) {
      covered2++;
      break;
    }
  }
  return covered2 / (end - start2);
}
function horizontalCoverage(edge, y, left, right) {
  if (left < 0 || right > edge.width || right <= left) return 0;
  let covered2 = 0;
  for (let x = left; x < right; x++) covered2 += edge.horizontal[y * edge.width + x];
  return covered2 / (right - left);
}
function inventoryGrid(edges, title, h) {
  const top = title.y + title.height, margin = Math.max(2, Math.round(h * 0.24));
  let best = -Infinity, result;
  for (let y = top; y <= Math.min(edges.height - 1, top + Math.round(1.2 * h)); y++) {
    const caps = segments(edges, y, Math.max(0, title.x - h), title.x + title.width, 3 * h);
    for (let i = 1; i < caps.length; i++) {
      const slot = caps[i - 1], grid = caps[i], separation = grid.left - slot.right;
      if (Math.abs(slot.left - title.x) > 0.7 * h || separation < 0.15 * h || separation > 1.6 * h || grid.right - grid.left < 0.55 * (slot.right - slot.left) || y + 2 * h >= edges.height) continue;
      const sides = (cap, start2, end) => Math.min(sideCoverage(edges, cap.left, start2, end, margin), sideCoverage(edges, cap.right, start2, end, margin));
      if (sides(slot, y + 1, y + 2 * h) < 0.65) continue;
      const topContrast = medianContrast(edges, grid);
      for (let bottom = y + Math.round(1.8 * h); bottom < Math.min(edges.height, y + 34 * h); bottom++) {
        const coverage = horizontalCoverage(edges, bottom, grid.left, grid.right);
        if (coverage < 0.87 || grid.left < 2 * margin || grid.right + 2 * margin > edges.width || horizontalCoverage(edges, bottom, grid.left - 2 * margin, grid.left - margin) > 0.6 || horizontalCoverage(edges, bottom, grid.right + margin, grid.right + 2 * margin) > 0.6) continue;
        const support = sides(grid, y + 1, bottom);
        const after = Math.min(edges.height, bottom + Math.max(3, Math.floor(h / 3)) + 1);
        if (support < 0.78 || after <= bottom + 2) continue;
        const onward = sides(grid, bottom + 2, after);
        const score = 2 * support + coverage - onward + topContrast / 100;
        if (onward > 0.4 || score <= best) continue;
        best = score;
        result = { x: grid.left, y, width: grid.right - grid.left, height: bottom - y + 1 };
      }
    }
  }
  return result;
}
function measureSafeBox(frame, anchor) {
  const h = Math.round(anchor.height);
  if (h < 6) return null;
  const x = Math.max(0, Math.floor(anchor.x - 3 * h)), y = Math.max(0, Math.floor(anchor.y - 2 * h));
  const width = Math.min(frame.width, Math.ceil(anchor.x + Math.max(45 * h, 8 * anchor.width))) - x;
  const height = Math.min(frame.height, Math.ceil(anchor.y + 39 * h)) - y;
  if (width * height > 8e6 || width <= 0 || height <= 0) return null;
  const edges = edgeMap(frame, { x, y, width, height }, h);
  const title = header(edges, { ...anchor, x: anchor.x - x, y: anchor.y - y, height: h });
  const items = title && inventoryGrid(edges, title, h);
  if (!title || !items) return null;
  const offset = (box) => ({ ...box, x: box.x + x, y: box.y + y });
  return { title: offset(title), items: offset(items) };
}

// src/calibration-viewport.ts
function project(area, roi) {
  const x = Math.floor(roi.x * area.width), y = Math.floor(roi.y * area.height);
  return {
    x: area.x + x,
    y: area.y + y,
    width: Math.ceil((roi.x + roi.width) * area.width) - x,
    height: Math.ceil((roi.y + roi.height) * area.height) - y
  };
}
function hintedViewport(frame, hint) {
  const [w, h] = hint.split(":").map(Number);
  const ratio = w && h && w > 0 && h > 0 ? w / h : 16 / 10;
  const width = Math.max(1, Math.min(frame.width, Math.round(frame.height * ratio)));
  const height = Math.max(1, Math.min(frame.height, Math.round(frame.width / ratio)));
  return { x: Math.floor((frame.width - width) / 2), y: Math.floor((frame.height - height) / 2), width, height };
}
function letterboxedViewport(frame) {
  const { width, height } = frame;
  function border(horizontal, reverse) {
    const across = horizontal ? width : height, extent = horizontal ? height : width;
    for (let offset = 0; offset < extent * 0.32; offset++) {
      const coordinate = reverse ? extent - 1 - offset : offset;
      let dark = 0;
      for (let n = 0; n < 48; n++) {
        const cross = Math.floor((n + 0.5) * across / 48);
        const at = (horizontal ? coordinate * width + cross : cross * width + coordinate) * 4;
        if (Math.max(frame.bgra[at], frame.bgra[at + 1], frame.bgra[at + 2]) <= 8) dark++;
      }
      if (dark < 47) return offset;
    }
    return 0;
  }
  const pair = (horizontal) => {
    const near = border(horizontal, false), far = border(horizontal, true);
    return Math.min(near, far) >= 4 && Math.abs(near - far) <= Math.max(3, near * 0.04) ? [near, far] : [0, 0];
  };
  const [x, right] = pair(false), [y, bottom] = pair(true);
  return { x, y, width: width - x - right, height: height - y - bottom };
}
function calibrationViewports(frame, aspectRatio) {
  return [hintedViewport(frame, aspectRatio), letterboxedViewport(frame), { x: 0, y: 0, width: frame.width, height: frame.height }];
}

// src/calibration-anchors.ts
var labels = {
  start: /^[开犴]始游戏$/u,
  gear: /^配装$/u,
  deploy: /^出发$/u,
  squad: /^出发[[(]?[1-3彐]\/([3彐引])[\])]?$/u,
  solo: /^行前备战$/u,
  mode: /^端游对局[一、]?$/u,
  matching: /^(匹配成功|正在匹配|正在搜索对局)$/u,
  safe: /^(安全箱|保险箱|safebox|securecontainer)$/u
};
var labelPatterns = Object.entries(labels);
function lineAnchors(line) {
  const result = [];
  for (let first = 0; first < line.words.length; first++) {
    let text = "", box = line.words[first].box;
    for (let last = first; last < Math.min(line.words.length, first + 10); last++) {
      const word = line.words[last];
      text += word.text.normalize("NFKC").toLowerCase().replace(/\s+/gu, "");
      if (text.length > 16) break;
      box = unionRect(box, word.box);
      const label = labelPatterns.find(([name, pattern]) => pattern.test(name === "safe" ? text.replace(/[:;：；]+$/u, "") : text))?.[0];
      if (!label) continue;
      const previous = line.words[first - 1], next = line.words[last + 1];
      if (previous && /[\p{L}\p{N}]$/u.test(previous.text.trim()) && box.x - previous.box.x - previous.box.width < box.height * 0.6) continue;
      if (next && (label === "safe" ? new RegExp("^\\p{L}", "u") : /^[\p{L}\p{N}]/u).test(next.text.trim()) && next.box.x - box.x - box.width < box.height * 0.6) continue;
      result.push({ label, box });
    }
  }
  return result;
}
function scanRaster(frame, box, enlargeText, maxScale) {
  const budget = 175e4;
  if (enlargeText && 4 * box.width * box.height <= budget && Math.max(box.width, box.height) <= 1150) {
    const gray = new Uint8Array(box.width * box.height);
    for (let y = 0, i = 0; y < box.height; y++) {
      let at = ((box.y + y) * frame.width + box.x) * 4;
      for (let x = 0; x < box.width; x++, i++, at += 4) {
        gray[i] = bgraGray(frame.bgra[at], frame.bgra[at + 1], frame.bgra[at + 2]);
      }
    }
    return doubleOcrRaster(gray, box.width, box.height);
  }
  const scale = Math.min(maxScale, Math.sqrt(budget / (box.width * box.height)), 2350 / Math.max(box.width, box.height));
  const width = Math.max(1, Math.floor(box.width * scale)), height = Math.max(1, Math.floor(box.height * scale));
  const bgra = new Uint8Array(width * height * 4);
  const pixels = new Uint32Array(bgra.buffer);
  const columns = Int32Array.from({ length: width }, (_, x) => box.x + Math.floor(x * box.width / width));
  const sourcePixels = frame.bgra.byteOffset % 4 === 0 ? new Uint32Array(frame.bgra.buffer, frame.bgra.byteOffset, frame.bgra.byteLength / 4) : null;
  for (let y = 0; y < height; y++) {
    const offset = (box.y + Math.floor(y * box.height / height)) * frame.width;
    for (let x = 0; x < width; x++) {
      const index = offset + columns[x];
      if (sourcePixels) pixels[y * width + x] = sourcePixels[index];
      else bgra.set(frame.bgra.subarray(index * 4, index * 4 + 4), (y * width + x) * 4);
    }
  }
  return { width, height, bgra };
}
function relative(box, frame) {
  return {
    x: box.x / frame.width,
    y: box.y / frame.height,
    width: (box.x + box.width) / frame.width - box.x / frame.width,
    height: (box.y + box.height) / frame.height - box.y / frame.height
  };
}
function matchingBanner(frame, start2, action) {
  const count = 24;
  const span = action.x + action.width - start2.x;
  let rows = 0;
  for (let y = Math.max(0, start2.y - 6 * start2.height); y < start2.y; y++) {
    let green = 0;
    for (let column = 0; column < count; column++) {
      const x = start2.x + Math.floor((column + 0.5) * span / count);
      const at = (frame.width * y + x) * 4;
      if (uiGreen(frame.bgra[at], frame.bgra[at + 1], frame.bgra[at + 2])) green++;
    }
    rows = green >= 21 ? rows + 1 : 0;
    if (rows >= Math.max(3, start2.height / 4)) return true;
  }
  return false;
}
function preparation(frame, anchors) {
  if (anchors.some(({ label }) => label === "matching")) return null;
  const boxes = (name) => anchors.filter(({ label }) => label === name).map(({ box }) => box);
  const actions = boxes("solo"), modes = boxes("mode");
  for (const gear of boxes("gear")) {
    const hasMode = modes.some((mode) => mode.y + mode.height < gear.y && gear.y - mode.y <= gear.height * 18 && Math.abs(mode.x - gear.x) <= 14 * Math.max(gear.width, mode.width));
    for (const button of [...boxes("squad"), ...hasMode ? boxes("deploy") : []]) {
      const gap = button.x - gear.x - gear.width;
      if (gap >= 0 && gap <= 8 * Math.max(button.width, gear.width) && Math.abs(gear.y + gear.height / 2 - button.y - button.height / 2) <= Math.max(button.height, gear.height)) actions.push(unionRect(gear, button));
    }
  }
  for (const start2 of boxes("start")) for (const action of actions) {
    if (action.x < start2.x + start2.width || action.y < start2.y + 3 * start2.height || matchingBanner(frame, start2, action)) continue;
    return { scene: "preparation", start: relative(start2, frame), actions: relative(action, frame) };
  }
  return null;
}
function preparationFocus(frame, anchors) {
  const start2 = anchors.find(({ label }) => label === "start");
  const action = anchors.find(({ label }) => label === "gear" || label === "solo" || label === "squad");
  if (!start2 && !action) return [];
  const size = (start2 ?? action).box.height;
  const x0 = start2 ? Math.min(frame.width - 1, start2.box.x + start2.box.width) : 0;
  const x1 = start2 ? frame.width : action.box.x;
  const y0 = start2 ? start2.box.y + start2.box.height : 0, y1 = start2 ? frame.height : action.box.y;
  const candidates = [];
  let active2 = [];
  function retain(box) {
    if (start2 ? box.height < size * 0.85 || box.height > size * 4 || box.width <= box.height * 3 : box.height < 2 || box.height >= size / 2 || box.y <= size * 2 || box.width >= size * 15) return;
    candidates.push(box);
    candidates.sort(start2 ? (a, b) => b.width * b.height - a.width * a.height : (a, b) => a.y - b.y || b.width - a.width);
    if (candidates.length > 3) candidates.pop();
  }
  const maxGap = start2 ? 3 * size : Math.ceil(size / 4);
  for (let y = y0; y < y1; y++) {
    const next = [];
    let first = -1, last = -1;
    for (let x = x0; x <= x1; x++) {
      if (x < x1) {
        const at = (y * frame.width + x) * 4, g = frame.bgra[at + 1];
        if (g > 102 && g - frame.bgra[at + 2] > 40 && g - frame.bgra[at] > 12) {
          if (first < 0) first = x;
          last = x;
          continue;
        }
      }
      if (first < 0 || x < x1 && x - last <= maxGap) continue;
      const width = last - first + 1;
      if (width >= size * 4 && width <= size * 35) {
        const prior = active2.find((box) => Math.abs(first - box.x) < size && Math.abs(width - box.width) < size * 1.5);
        if (prior) {
          prior.height = y - prior.y + 1;
          next.push(prior);
        } else {
          next.push({ x: first, y, width, height: 1 });
        }
      }
      first = last = -1;
    }
    for (const candidate of active2) if (!next.includes(candidate)) retain(candidate);
    active2 = next;
  }
  for (const candidate of active2) retain(candidate);
  return start2 ? candidates : candidates.map((box) => ({ ...box, y: Math.max(0, box.y - 3 * size), height: Math.min(box.y, 3 * size) }));
}
async function detectCalibrationAnchors(frame, aspectRatio, ocr2) {
  const areas = calibrationViewports(frame, aspectRatio);
  const whole = areas[2];
  const scanned = /* @__PURE__ */ new Set(), anchors = [];
  const measured = /* @__PURE__ */ new Map();
  async function scan(box, enlarge = false, maxScale = 2.4) {
    const key = [box.x, box.y, box.width, box.height, enlarge, maxScale].join("/");
    if (scanned.has(key) || box.width < 2 || box.height < 2) return;
    scanned.add(key);
    const raster = scanRaster(frame, box, enlarge, maxScale);
    const layout = await ocr2.recognizeLayout({ ...frame, ...raster });
    if (layout.truncated) return;
    for (const line of layout.lines) for (const hit of lineAnchors(line)) {
      const p = hit.box;
      const x = box.x + Math.round(p.x * box.width / raster.width), y = box.y + Math.round(p.y * box.height / raster.height);
      const right = box.x + Math.round((p.x + p.width) * box.width / raster.width);
      const bottom = box.y + Math.round((p.y + p.height) * box.height / raster.height);
      if (right > x && bottom > y) anchors.push({ label: hit.label, box: { x, y, width: right - x, height: bottom - y } });
    }
  }
  function inventory() {
    let chosen = null;
    for (const { label, box } of anchors) {
      if (label !== "safe") continue;
      const key = [box.x, box.y, box.width, box.height].join("/");
      if (!measured.has(key)) measured.set(key, measureSafeBox(frame, box));
      const grid = measured.get(key);
      if (!grid) continue;
      if (chosen && (Math.abs(chosen.items.x - grid.items.x) > 4 || Math.abs(chosen.items.y - grid.items.y) > 4 || Math.abs(chosen.items.width - grid.items.width) > 4 || Math.abs(chosen.items.height - grid.items.height) > 4)) return null;
      chosen = grid;
    }
    return chosen && { scene: "inventory", loot: { contextRoi: relative(chosen.title, frame), itemsRoi: relative(chosen.items, frame) } };
  }
  for (const area of areas) {
    await scan(project(area, { x: 0.24, y: 0.49, width: 0.42, height: 0.43 }));
    const loot = inventory();
    if (loot) return loot;
    await scan(project(area, PREPARATION_ROIS.start), true);
    await scan(project(area, PREPARATION_ROIS.actions), true);
    if (anchors.some(({ label }) => label === "deploy") && !anchors.some(({ label }) => label === "squad")) await scan(project(area, SOLO_PREPARATION_MODE_ROI), true);
    const ready = preparation(frame, anchors);
    if (ready) return ready;
  }
  await scan(whole);
  const overviewLoot = inventory();
  if (overviewLoot) return overviewLoot;
  for (const y of [0, 0.41]) for (const x of [0, 0.41]) {
    await scan(project(whole, { x, y, width: 0.59, height: 0.59 }));
  }
  const found = inventory() ?? preparation(frame, anchors);
  if (found || anchors.some(({ label }) => label === "matching")) return found;
  if (anchors.some(({ label }) => label === "gear" || label === "squad" || label === "solo") && !anchors.some(({ label }) => label === "start")) {
    await scan(project(whole, { x: 0, y: 0, width: 0.58, height: 0.58 }), false, 1);
    const ready = preparation(frame, anchors);
    if (ready) return ready;
  }
  for (const box of preparationFocus(frame, anchors)) {
    await scan(box, true);
    const ready = preparation(frame, anchors);
    if (ready) return ready;
  }
  return null;
}

// src/profile-identity.ts
var profileTitles = /* @__PURE__ */ new Set(["\u4E2A\u4EBA\u4FE1\u606F", "\u4E2A\u4EBA\u8D44\u6599", "\u4E2A\u4EBA\u6863\u6848", "\u6211\u7684\u8D44\u6599", "\u6211\u7684\u6863\u6848", "myprofile", "playerprofile", "playerinfo", "personalinformation"]);
var nicknameLabel = /^(?:(?:玩\s*家\s*|游\s*戏\s*|角\s*色\s*)?昵\s*称|(?:player\s+name|nick\s*name))(?=\s|[:：]|$)[\s:：]*(.*)$/iu;
var uidField = /^(?:cn\s*)?(?:u\s*i\s*d|玩家\s*ID|数字\s*ID|角色\s*ID)(?:\s*[:：#=_-].*|\s*\d[\d\s_-]*)?$/iu;
var placeholders = /* @__PURE__ */ new Set(["\u533F\u540D\u73A9\u5BB6", "anonymousplayer"]);
var profileTab = { x: 0.066, y: 0.047, width: 0.069, height: 0.047 };
var watermarkFormat = /^(?:cn)?uid[:#]?(\d{8,24})(?:_\d+)?$/u;
var playerNumberFormat = /^(?:编号|uid|playerid)[:#]?(\d{8,24})$/u;
var isProfileTitle = (text) => profileTitles.has(compactLower(text));
var excludesOwnProfile = (text) => /^(?:出发(?:\(?[123]\/3\)?)?|准备就绪|邀请入队|他人资料|举报玩家|reportplayer)$/u.test(compactLower(text));
var hasNicknameLabel = (text) => nicknameLabel.test(text.trim());
function validIdentityNickname(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 64 || /[\p{Cc}\p{Cf}]/u.test(value)) return false;
  const name = value.trim();
  return !placeholders.has(compactLower(name)) && !uidField.test(name.normalize("NFKC"));
}
function adjacentValue(label, other) {
  const a = label.box, b = other.box;
  const overlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  const gap = b.x - (a.x + a.width);
  return other !== label && overlap >= 0.65 * Math.min(a.height, b.height) && gap >= 0 && gap <= 4 * a.height;
}
function contains(area, box) {
  return box.x >= area.x && box.y >= area.y && box.x + box.width <= area.x + area.width && box.y + box.height <= area.y + area.height;
}
function selectedProfileTab(frame, area) {
  const stripe = project(area, { x: 0.072, y: 0.087, width: 0.056, height: 0.01 });
  for (let y = stripe.y; y < stripe.y + stripe.height; y++) {
    let green = 0;
    for (let i = 0; i < 16; i++) {
      const x = stripe.x + Math.floor((i + 0.5) * stripe.width / 16);
      const p = (y * frame.width + x) * 4;
      const b = frame.bgra[p], g = frame.bgra[p + 1], r = frame.bgra[p + 2];
      if (uiGreen(b, g, r)) green++;
    }
    if (green >= 15) return true;
  }
  return false;
}
function accountNumber(lines, area, format) {
  const matches = lines.filter((line) => contains(area, line.box)).map((line) => format.exec(compactLower(line.text))?.[1]).filter(Boolean);
  return matches.length === 1 ? matches[0] : void 0;
}
function frameLines(layout, frame) {
  const sx = frame.width / layout.width, sy = frame.height / layout.height;
  return layout.lines.map((line) => ({ ...line, box: {
    x: line.box.x * sx,
    y: line.box.y * sy,
    width: line.box.width * sx,
    height: line.box.height * sy
  } }));
}
function cardAccounts(lines, area) {
  const watermark = project(area, { x: 0, y: 0, width: 0.35, height: 0.04 });
  const footer = project(area, { x: 0.737, y: 0.899, width: 0.22, height: 0.047 });
  return { account: accountNumber(lines, watermark, watermarkFormat), player: accountNumber(lines, footer, playerNumberFormat) };
}
function validCardName(name) {
  return validIdentityNickname(name) && /^[\p{L}\p{M}\p{N}_-]+$/u.test(name) && new RegExp("\\p{L}", "u").test(name) && !isProfileTitle(name) && !/^(?:编号|uid|playerid|lv|等级)[_-]?\d*$/iu.test(name);
}
function cardNameLine(lines, area) {
  const row = project(area, { x: 0.755, y: 0.788, width: 0.193, height: 0.023 });
  const overlapping = lines.filter(({ box }) => box.y < row.y + row.height && box.y + box.height > row.y && box.x < row.x + row.width && box.x + box.width > row.x);
  if (overlapping.length !== 1) return;
  const line = overlapping[0];
  if (contains(row, line.box) && line.box.x <= area.x + 0.761 * area.width && validCardName(line.text.trim())) return line;
}
function cardIdentity(layout, frame, aspectRatio, labeledName) {
  const lines = frameLines(layout, frame);
  const candidates = new Set(labeledName ? [labeledName] : []);
  let selected = false, inactiveCard = false, activeCard = false;
  for (const area of calibrationViewports(frame, aspectRatio)) {
    const tab = project(area, profileTab);
    if (!lines.some((line) => contains(tab, line.box) && profileTitles.has(compactLower(line.text)))) continue;
    const { account, player } = cardAccounts(lines, area);
    if (account && player && account !== player) return { status: "profile-unrecognized" };
    if (!selectedProfileTab(frame, area)) {
      if (account && player) inactiveCard = true;
      continue;
    }
    selected = true;
    if (!account || !player) continue;
    activeCard = true;
    const name = cardNameLine(lines, area);
    if (name) candidates.add(name.text.trim());
  }
  if (inactiveCard && !activeCard) return { status: "profile-unrecognized" };
  const [nickname] = candidates;
  if (nickname && candidates.size === 1) return { status: "candidate", nickname };
  return { status: selected ? "nickname-unreadable" : "profile-unrecognized" };
}
function profileIdentity(layout, frame, aspectRatio = DEFAULT_GAME_ASPECT_RATIO) {
  const lines = layout.lines;
  if (!lines.some((line) => isProfileTitle(line.text)) || lines.some((line) => excludesOwnProfile(line.text))) {
    return { status: "profile-unrecognized" };
  }
  if (layout.truncated) return { status: "nickname-unreadable" };
  const candidates = /* @__PURE__ */ new Set();
  for (const line of lines) {
    const match = nicknameLabel.exec(line.text.trim());
    if (!match) continue;
    const neighbors = match[1] ? [match[1]] : lines.filter((other) => adjacentValue(line, other)).map((other) => other.text);
    if (neighbors.length !== 1) return { status: "nickname-unreadable" };
    const name = neighbors[0].trim();
    if (!validIdentityNickname(name) || !/[\p{L}]/u.test(name) || /[:：]|\s(?:UID|玩家\s*ID)(?=[\s\d#=_-]|$)/iu.test(name) || profileTitles.has(compactLower(name))) return { status: "nickname-unreadable" };
    candidates.add(name);
  }
  const [nickname] = candidates;
  if (candidates.size <= 1 && frame) return cardIdentity(layout, frame, aspectRatio, nickname);
  return nickname && candidates.size === 1 ? { status: "candidate", nickname } : { status: "nickname-unreadable" };
}

// src/profile-name-region.ts
var nativeAspect = 16 / 9;
function* horizontalRuns(area, bright) {
  const right = area.x + area.width;
  for (let y = area.y; y < area.y + area.height; y++) {
    let x = area.x;
    while (x < right) {
      while (x < right && !bright(x, y)) x++;
      const start2 = x;
      while (x < right && bright(x, y)) x++;
      if (x > start2) yield { x: start2, y, width: x - start2 };
    }
  }
}
function briefcaseTop(viewport, bright) {
  const area = project(viewport, { x: 0.742, y: 0.79, width: 0.016, height: 0.012 });
  const sy = viewport.height / 1440;
  for (const run of horizontalRuns(area, bright)) {
    if (run.width < 65e-4 * viewport.width || run.width > 0.012 * viewport.width) continue;
    const sample = (u, dy) => bright(run.x + Math.round((run.width - 1) * u), run.y + Math.round(dy * sy));
    if (sample(0.2, -2) || sample(0.8, -2) || sample(0.5, -2)) continue;
    if (!sample(0.18, 2) || !sample(0.82, 2) || !sample(0.18, 10) || !sample(0.82, 10)) continue;
    if (!sample(0.5, 5) && sample(0.5, 11)) return run;
  }
}
function matchesPencil(line, viewport, bright) {
  const height = line.width * nativeAspect * viewport.height / viewport.width;
  const gapY = line.y - Math.max(1, Math.round(height * 0.13));
  for (let x = line.x; x < line.x + line.width; x++) if (bright(x, gapY)) return false;
  const matchesSlice = (dy, center) => {
    const y = line.y - dy;
    let left = line.width, right = -1;
    for (let dx = 0; dx < line.width; dx++) {
      if (bright(line.x + dx, y)) {
        left = Math.min(left, dx);
        right = dx;
      }
    }
    return right >= left && right - left + 1 <= line.width * 0.43 && Math.abs((left + right + 1) / (2 * line.width) - center) <= 0.15;
  };
  for (let dy = Math.round(height * 0.24); dy <= Math.round(height * 0.71); dy++) {
    if (!matchesSlice(dy, 0.92 * dy / height - 0.105)) return false;
  }
  return matchesSlice(Math.round(height * 0.91), 0.8);
}
function profileNameRegion(frame, viewport, report) {
  const missing = (reason) => {
    report?.(reason);
    return null;
  };
  const neutral = (threshold) => (x2, y2) => {
    const at = (y2 * frame.width + x2) * 4;
    const b = frame.bgra[at], g = frame.bgra[at + 1], r = frame.bgra[at + 2];
    const low = Math.min(r, g, b);
    return low >= threshold && Math.max(r, g, b) - low <= 32;
  };
  const inkPixel = neutral(145);
  const badge = briefcaseTop(viewport, inkPixel);
  if (!badge) return missing("badge-missing");
  const row = project(viewport, { x: 0.754, y: 0.7885, width: 0.218, height: 0.0235 });
  const baselines = project(viewport, { x: 0.754, y: 0.802, width: 0.218, height: 0.011 });
  const shaft = neutral(117);
  let pencil;
  for (const run of horizontalRuns(baselines, neutral(102))) {
    if (run.x <= badge.x + badge.width || run.width < 6e-3 * viewport.width || run.width > 0.011 * viewport.width) continue;
    if (!matchesPencil(run, viewport, shaft)) continue;
    if (pencil && Math.abs(pencil.x - run.x) > run.width * 0.2) return missing("pencil-ambiguous");
    pencil = run;
  }
  if (!pencil) return missing("pencil-missing");
  let start2 = badge.x + badge.width;
  for (let y2 = badge.y; y2 < row.y + row.height; y2++) {
    let x2 = badge.x + Math.floor(0.75 * badge.width);
    while (x2 < pencil.x && inkPixel(x2, y2)) x2++;
    start2 = Math.max(start2, x2);
  }
  const end = pencil.x;
  let left = end, right = start2 - 1, top = row.y + row.height, bottom = row.y - 1;
  for (let y2 = row.y; y2 < row.y + row.height; y2++) for (let x2 = start2; x2 < end; x2++) {
    if (!inkPixel(x2, y2)) continue;
    left = Math.min(left, x2);
    right = Math.max(right, x2);
    top = Math.min(top, y2);
    bottom = Math.max(bottom, y2);
  }
  if (right < left) return missing("no-ink");
  if (left <= start2 || right >= end - 1 || top <= row.y || bottom >= row.y + row.height - 1) return missing("ink-touches-edge");
  const ink = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  if (left - start2 > badge.width * 0.7 || end - right > badge.width * 1.2) return missing("icon-gap");
  const padX = Math.max(1, Math.round(ink.height * 0.22 * viewport.width / (viewport.height * nativeAspect)));
  const padY = Math.max(1, Math.round(ink.height * 0.25));
  const x = Math.max(start2, left - padX), y = Math.max(row.y, top - padY);
  report?.("found");
  return { box: {
    x,
    y,
    width: Math.min(end, right + 1 + padX) - x,
    height: Math.min(row.y + row.height, bottom + 1 + padY) - y
  }, ink };
}

// src/profile-recognition.ts
var unreadable = { status: "nickname-unreadable" };
var unrecognized = { status: "profile-unrecognized" };
var historyTab = { x: 0.135, y: 0.047, width: 0.066, height: 0.047 };
function singleLine(layout) {
  return layout && !layout.truncated && layout.lines.length === 1 ? layout.lines[0] : void 0;
}
async function readField(read, field, box, format) {
  for (const twice of [false, true]) {
    const line = singleLine(await read(field, box, twice));
    const match = line && format.exec(compactLower(line.text));
    if (match) return match[1];
  }
}
async function recognizedTab(read, area) {
  const box = project(area, profileTab);
  let nearTitle = false;
  for (const twice of [false, true]) {
    const line = singleLine(await read("profile-tab", box, twice));
    if (!line) continue;
    const title = compactLower(line.text);
    if (isProfileTitle(title)) return "exact";
    if (new RegExp("^\\p{Script=Han}{4}$", "u").test(title) && [...title].filter((c, i) => c !== "\u4E2A\u4EBA\u4FE1\u606F"[i]).length === 1) nearTitle = true;
  }
  if (!nearTitle) return "no-match";
  const history = await readField(read, "history-tab", project(area, historyTab), /^(历史战绩)$/u);
  return history ? "history-confirmed" : "history-unconfirmed";
}
function lineRegion(ink, frame) {
  const pad = Math.ceil(ink.height * 0.2);
  const x = Math.max(0, Math.floor(ink.x) - pad), y = Math.max(0, Math.floor(ink.y) - pad);
  return { ink, box: {
    x,
    y,
    width: Math.min(frame.width, Math.ceil(ink.x + ink.width) + pad) - x,
    height: Math.min(frame.height, Math.ceil(ink.y + ink.height) + pad) - y
  } };
}
function nameText(line) {
  const name = line.text.trim();
  if (validCardName(name)) return { name };
  const tokens = name.split(/\s+/u);
  if (tokens.length < 2 || tokens.length !== line.words.length || !tokens.every((token, i) => token === line.words[i].text)) {
    return { rejection: "invalid-text" };
  }
  for (let i = 1; i < line.words.length; i++) {
    const left = line.words[i - 1], right = line.words[i];
    if (!new RegExp("\\p{Script=Han}$", "u").test(left.text) && !new RegExp("^\\p{Script=Han}", "u").test(right.text)) return { rejection: "invalid-text" };
    const gap = right.box.x - left.box.x - left.box.width;
    const overlap = Math.min(left.box.y + left.box.height, right.box.y + right.box.height) - Math.max(left.box.y, right.box.y);
    const height = Math.min(left.box.height, right.box.height);
    if (gap < -0.1 * height || gap > 0.2 * height || overlap < 0.65 * height) return { rejection: "word-spacing" };
  }
  const joined = tokens.join("");
  return validCardName(joined) ? { name: joined } : { rejection: "invalid-text" };
}
async function readName(read, region, overviewName, trace) {
  const { box, ink } = region;
  let previous = overviewName;
  let complete = false;
  for (const twice of [false, true]) {
    const scale = twice ? 2 : 1;
    const layout = await read("nickname", box, twice);
    const line = singleLine(layout);
    if (!layout) continue;
    if (!line) {
      trace?.({ stage: "name-reading", scale, result: "no-single-line" });
      continue;
    }
    const reading = nameText(line);
    if ("rejection" in reading) {
      trace?.({ stage: "name-reading", scale, result: reading.rejection });
      continue;
    }
    const { name } = reading;
    if (previous && previous !== name) {
      trace?.({ stage: "name-reading", scale, result: "conflict" });
      return;
    }
    const corroborated = name === previous;
    previous = name;
    const toFrame = box.width / layout.width;
    const left = box.x + line.box.x * toFrame, right = left + line.box.width * toFrame;
    const slack = Math.max(2, ink.height * 0.16);
    const leftErrorPx = left - ink.x, rightErrorPx = right - ink.x - ink.width;
    const coversInk = Math.abs(leftErrorPx) <= slack && Math.abs(rightErrorPx) <= slack;
    trace?.({
      stage: "name-reading",
      scale,
      leftErrorPx,
      rightErrorPx,
      tolerancePx: slack,
      result: !coversInk ? "ink-edges-mismatch" : corroborated ? "corroborated" : "covers-ink"
    });
    if (!coversInk) continue;
    complete = true;
    if (corroborated) return name;
  }
  return complete ? previous : void 0;
}
async function recognizeProfile(frame, aspectRatio, ocr2, deadline = Date.now() + 2e4, trace) {
  let ocrCalls = 0, deadlineSkipped = false;
  const finish = (result, reason) => {
    trace?.({ stage: "finish", status: result.status, reason, ocrCalls, localOcrStarted: ocrCalls > 1, deadlineSkipped });
    return result;
  };
  const performOcr = async (field, box, scale, raster) => {
    ocrCalls++;
    trace?.({ stage: "ocr-start", field, box, scale, width: raster.width, height: raster.height });
    try {
      const layout = await ocr2.recognizeLayout({ ...frame, ...raster });
      trace?.({ stage: "ocr-result", field, box, scale, lineCount: layout.lines.length, truncated: layout.truncated });
      return layout;
    } catch (error) {
      finish({ status: "ocr-unavailable" }, "ocr-error");
      throw error;
    }
  };
  trace?.({ stage: "recognition-start", deadline, remainingMs: Math.max(0, deadline - Date.now()) });
  const areas = calibrationViewports(frame, aspectRatio);
  const overview = await performOcr("overview", areas[2], 1, scanRaster(frame, areas[2], false, 1));
  if (overview.lines.some((line) => excludesOwnProfile(line.text))) return finish(unrecognized, "excluded-page");
  if (overview.truncated) return finish(unreadable, "overview-truncated");
  const lines = frameLines(overview, frame);
  const legacy = profileIdentity(overview);
  const labeled = overview.lines.some((line) => hasNicknameLabel(line.text));
  trace?.({ stage: "legacy", status: legacy.status, hasNicknameLabel: labeled });
  if (labeled && legacy.status === "nickname-unreadable") return finish(legacy, "legacy-label-unreadable");
  const tiles = /* @__PURE__ */ new Map();
  let card = false, selected = false;
  const read = async (field, box, twice) => {
    const scale = twice ? 2 : 1;
    const key = [box.x, box.y, box.width, box.height, twice].join("/");
    const previous = tiles.get(key);
    if (previous) {
      trace?.({ stage: "ocr-skip", field, box, scale, reason: "cached" });
      return previous;
    }
    if (Date.now() >= deadline) {
      deadlineSkipped = true;
      trace?.({ stage: "ocr-skip", field, box, scale, reason: "deadline" });
      return;
    }
    const raster = scanRaster(frame, box, twice, 1);
    if (twice && (raster.width !== 2 * box.width || raster.height !== 2 * box.height)) {
      trace?.({ stage: "ocr-skip", field, box, scale, reason: "scale-unavailable" });
      return;
    }
    const layout = await performOcr(field, box, scale, raster);
    tiles.set(key, layout);
    return layout;
  };
  const sameViewport = (a, b) => Math.abs(a.x - b.x) <= frame.width * 3e-3 && Math.abs(a.width - b.width) <= frame.width * 3e-3 && Math.abs(a.y - b.y) <= frame.height * 3e-3 && Math.abs(a.height - b.height) <= frame.height * 3e-3;
  const [hint, measured, whole] = areas;
  const viewports = [measured];
  if (!sameViewport(hint, measured)) viewports.unshift(hint);
  if (!viewports.some((area) => sameViewport(area, whole))) viewports.push(whole);
  for (const area of viewports) {
    const selectedGreenLine = selectedProfileTab(frame, area);
    trace?.({ stage: "viewport", kind: area === hint ? "hint" : area === measured ? "measured" : "whole", box: area, selectedGreenLine });
    if (!selectedGreenLine) continue;
    selected = true;
    const evidence = await recognizedTab(read, area);
    trace?.({ stage: "title", evidence });
    if (evidence !== "exact" && evidence !== "history-confirmed") continue;
    card = true;
    const full = cardAccounts(lines, area);
    const account = full.account ?? await readField(read, "watermark", project(area, { x: 0.011, y: 3e-3, width: 0.18, height: 0.022 }), watermarkFormat);
    const player = full.player ?? await readField(read, "player-number", project(area, { x: 0.743, y: 0.902, width: 0.128, height: 0.032 }), playerNumberFormat);
    trace?.({ stage: "accounts", hasAccount: !!account, hasPlayer: !!player, match: account && player ? account === player : null });
    if (account && player && account !== player) return finish(unrecognized, "account-mismatch");
    const fullName = cardNameLine(lines, area);
    const iconRegion = profileNameRegion(frame, area, trace && ((result) => trace({ stage: "name-icons", result })));
    const region = iconRegion ?? (account && player && fullName ? lineRegion(fullName.box, frame) : null);
    if (!region) {
      trace?.({ stage: "name-region", source: "missing" });
      continue;
    }
    const { box, ink } = region;
    trace?.({ stage: "name-region", source: iconRegion ? "icons" : "overview", box, ink, paddingPx: {
      left: ink.x - box.x,
      top: ink.y - box.y,
      right: box.x + box.width - ink.x - ink.width,
      bottom: box.y + box.height - ink.y - ink.height
    } });
    const name = await readName(read, region, fullName?.text.trim(), trace);
    if (!name) return finish(unreadable, "nickname-unreadable");
    if (legacy.status === "candidate" && legacy.nickname !== name) return finish(unreadable, "legacy-name-conflict");
    return finish({ status: "candidate", nickname: name }, "card-candidate");
  }
  if (!card) {
    if (legacy.status !== "candidate") return finish(legacy, selected ? "title-unconfirmed" : "no-selected-tab");
    const playerCard = viewports.some((area) => {
      const { account, player } = cardAccounts(lines, area);
      return account && player || profileNameRegion(frame, area);
    });
    return playerCard ? finish(unrecognized, "legacy-card-veto") : finish(legacy, "legacy-candidate");
  }
  return finish(unreadable, "name-region-missing");
}

// src/identity-debug-png.ts
import { crc32, deflateSync } from "node:zlib";
function chunk(type, data) {
  const result = Buffer.allocUnsafe(12 + data.length);
  result.writeUInt32BE(data.length);
  result.write(type, 4, 4, "ascii");
  data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4);
  return result;
}
function encodeIdentityFrame({ width, height, bgra }) {
  const header2 = Buffer.alloc(13);
  header2.writeUInt32BE(width);
  header2.writeUInt32BE(height, 4);
  header2[8] = 8;
  header2[9] = 2;
  const scanlines = Buffer.allocUnsafe(height * (1 + width * 3));
  let read = 0, write = 0;
  for (let y = 0; y < height; y++) {
    scanlines[write++] = 0;
    for (let x = 0; x < width; x++, read += 4) {
      scanlines[write++] = bgra[read + 2];
      scanlines[write++] = bgra[read + 1];
      scanlines[write++] = bgra[read];
    }
  }
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header2),
    chunk("IDAT", deflateSync(scanlines, { level: 1 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// src/calibration-capture.ts
var MAX_CAPTURE_PIXELS = 7680 * 4320;
var FULL_DISPLAY = { x: 0, y: 0, width: 1, height: 1 };
function hasMatchingBanner(region) {
  const columns = 16;
  let green = 0;
  for (const y of [10, 20, 30]) for (let column = 0; column < columns; column++) {
    const x = Math.floor((column + 0.5) * region.width / columns), at = (y * region.width + x) * 4;
    const b = region.bgra[at], g = region.bgra[at + 1], r = region.bgra[at + 2];
    if (uiGreen(b, g, r)) green++;
  }
  return green >= 42;
}
async function analyzeCapture(request, region, capture) {
  if (supportsPreparation(region) && hasMatchingBanner(region)) return { status: "scene-unrecognized", capture };
  try {
    const language = request.language || "zh-CN";
    const ocr2 = await createOcr(language);
    try {
      if (!ocr2.language) return { status: "ocr-unavailable", capture };
      const match = await detectCalibrationAnchors(region, request.gameAspectRatio ?? DEFAULT_GAME_ASPECT_RATIO, ocr2);
      if (match?.scene === "inventory") return { status: "inventory-ready", capture, loot: match.loot };
      if (match?.scene === "preparation") return { status: "ready", capture, anchors: { start: match.start, actions: match.actions } };
      return { status: "scene-unrecognized", capture };
    } finally {
      await ocr2.close();
    }
  } catch {
    return { status: "ocr-unavailable", capture };
  }
}
function errorReason(error, operation) {
  const message = error instanceof Error ? error.message : "";
  if (/timed?\s*out/i.test(message)) return operation + "-timeout";
  if (message === "OCR region exceeds pixel limit") return "ocr-pixel-limit";
  if (message === "displayChanged" || message === "displayUnavailable") return message === "displayChanged" ? "source-changed" : "display-unavailable";
  return operation + "-exception";
}
function errorDetails(error) {
  if (!(error instanceof Error)) return {};
  const locations = [];
  for (const line of (error.stack ?? "").split("\n").slice(1)) {
    const location = /[\\/]((?:profile-[a-z-]+|calibration(?:-[a-z-]+)?|engine-child|standalone-capture|identity-debug-png|ocr)\.(?:js|ts):\d+:\d+)\)?$/.exec(line);
    if (location) locations.push(location[1]);
    if (locations.length === 4) break;
  }
  const errorType = ["TypeError", "RangeError", "ReferenceError", "SyntaxError"].includes(error.name) ? error.name : "Error";
  return { errorType, locations };
}
async function readProfile(region, language, aspectRatio, deadline, progress) {
  let operation = "open-ocr";
  try {
    const ocr2 = await createOcr(language || "zh-CN");
    try {
      progress?.({ kind: "trace", event: { stage: "ocr-open", language: ocr2.language, availableLanguages: ocr2.availableLanguages } });
      if (!ocr2.language) return { status: "identity", suggestion: { status: "ocr-unavailable" }, reason: "ocr-language-unavailable" };
      operation = "recognize-profile";
      const suggestion = await recognizeProfile(region, aspectRatio, ocr2, deadline, progress ? (event) => progress({ kind: "trace", event }) : void 0);
      return { status: "identity", suggestion };
    } finally {
      await ocr2.close();
    }
  } catch (error) {
    const reason = errorReason(error, "ocr");
    progress?.({ kind: "trace", event: { stage: "error", operation, reason, ...errorDetails(error) } });
    return { status: "identity", suggestion: { status: "ocr-unavailable" }, reason };
  }
}
async function runCalibrationCapture(request, sink) {
  const identityDeadline = Date.now() + 2e4;
  let source2;
  const identity = request.kind === "identity-suggest";
  const progress = identity && sink ? (event) => {
    try {
      sink(event);
    } catch {
    }
  } : void 0;
  const failure = (reason) => ({ status: "capture-unavailable", ...identity && { reason } });
  let operation = "open-source";
  try {
    const module = await import(request.frameSourceModule);
    source2 = await module.createFrameSource();
    operation = "probe-display";
    const probe = await source2.captureRoi(request.displayId, CALIBRATION_SOURCE_PROBE);
    if (request.displayId ? probe.display.id !== request.displayId : !probe.display.primary) return failure("display-mismatch");
    if (request.kind === "calibration-source") return { status: "source", source: { display: probe.display, topologyRevision: probe.topologyRevision } };
    const { width, height } = probe.display.bounds;
    progress?.({ kind: "trace", event: {
      stage: "display",
      width,
      height,
      displayId: probe.display.id,
      systemNumber: probe.display.systemNumber,
      scaleFactor: probe.display.scaleFactor
    } });
    if (width * height > MAX_CAPTURE_PIXELS) return { status: "unsupported-layout" };
    if (request.kind === "calibration-preview") {
      const capture2 = await source2.capture(request.displayId);
      return sameCalibrationSource(probe, capture2.frame) && capture2.jpeg.byteLength <= DELTA_MAX_JPEG_BYTES ? { status: "manual-preview", capture: capture2 } : failure("source-changed");
    }
    if (identity) {
      operation = "capture-frame";
      const region2 = await source2.captureRoi(request.displayId, FULL_DISPLAY);
      if (!sameCalibrationSource(probe, region2)) return failure("source-changed");
      if (region2.width !== width || region2.height !== height || region2.bgra.byteLength !== width * height * 4) return failure("invalid-frame");
      if (progress) {
        try {
          progress({
            kind: "frame",
            width,
            height,
            displayId: region2.display.id,
            systemNumber: region2.display.systemNumber,
            capturedAt: region2.capturedAt,
            png: encodeIdentityFrame(region2)
          });
        } catch (error) {
          progress({ kind: "trace", event: { stage: "error", operation: "encode-frame", reason: "png-encoding-failed", ...errorDetails(error) } });
        }
      }
      const result2 = await readProfile(region2, request.language || "zh-CN", request.gameAspectRatio ?? DEFAULT_GAME_ASPECT_RATIO, identityDeadline, progress);
      operation = "verify-display";
      const current2 = await source2.captureRoi(request.displayId, CALIBRATION_SOURCE_PROBE);
      return sameCalibrationSource(current2, probe) ? result2 : failure("source-changed");
    }
    const { capture, region } = await source2.captureEvidence(request.displayId, FULL_DISPLAY);
    if (!sameCalibrationSource(probe, capture.frame) || !sameCalibrationSource(probe, region) || capture.frame.capturedAt !== region.capturedAt || capture.jpeg.byteLength > DELTA_MAX_JPEG_BYTES) return { status: "capture-unavailable" };
    const result = region.width === width && region.height === height && region.bgra.byteLength === width * height * 4 ? await analyzeCapture(request, region, capture) : { status: "unsupported-layout", capture };
    const current = await source2.captureRoi(request.displayId, CALIBRATION_SOURCE_PROBE);
    if (!sameCalibrationSource(current, capture.frame)) return { status: "capture-unavailable" };
    return result;
  } catch (error) {
    const reason = errorReason(error, "capture");
    progress?.({ kind: "trace", event: { stage: "error", operation, reason, ...errorDetails(error) } });
    return failure(reason);
  } finally {
    await source2?.close?.().catch(() => {
    });
  }
}

// src/config.ts
var DELTA_SPEECH_DEFAULTS = {
  enabled: true,
  probability: 0.5,
  cooldownMs: 45e3,
  eventKinds: ["kill", "knockdown", "loot"],
  relations: ["self"],
  style: "playful"
};
var DELTA_DEFAULTS = {
  enabled: false,
  observer: { enabled: false },
  standaloneDisplayId: "",
  captureIntervalMs: 1e3,
  calibrationHotkeyEnabled: true,
  gameAspectRatio: DEFAULT_GAME_ASPECT_RATIO,
  detection: { enabled: false, nickname: "", language: "", calibration: null },
  loot: { enabled: false, language: "", sensitivity: "balanced", calibration: null },
  speech: {
    enabled: DELTA_SPEECH_DEFAULTS.enabled,
    probability: DELTA_SPEECH_DEFAULTS.probability,
    cooldownMs: DELTA_SPEECH_DEFAULTS.cooldownMs,
    style: DELTA_SPEECH_DEFAULTS.style,
    events: { kill: true, knockdown: true, loot: true },
    attribution: { self: true, teammate: false, unknown: false }
  },
  events: { maxPending: 8, ttlMs: 15e3, dedupMs: 6e4 },
  worker: { heartbeatMs: 500, heartbeatTimeoutMs: 4e3, restartDelayMs: 250, maxRestarts: 2 }
};

// src/shared-ocr.ts
var SharedOcr = class {
  constructor(openPort = createOcr) {
    this.openPort = openPort;
  }
  openPort;
  port = null;
  language = "";
  tail = Promise.resolve();
  closed = false;
  leases = 0;
  retiring = null;
  async open(language) {
    if (this.closed) throw new Error("OCR service stopped");
    if (this.retiring) await this.retiring;
    if (this.closed) throw new Error("OCR service stopped");
    if (this.port && language !== this.language) throw new Error("OCR language conflict");
    if (!this.port) {
      this.language = language;
      this.port = this.openPort(language);
    }
    const owned = this.port;
    this.leases++;
    let port;
    try {
      port = await owned;
    } catch (error) {
      if (this.port === owned && --this.leases === 0) {
        this.port = null;
        this.language = "";
      }
      throw error;
    }
    if (this.closed || this.port !== owned) throw new Error("OCR service stopped");
    void port.exited.then(() => {
      if (this.port === owned) void this.retire(owned);
    });
    let released = false, release = null;
    const recognizeLayout = (region) => {
      if (released || this.closed || this.port !== owned) return Promise.reject(new Error("OCR lease closed"));
      const request = this.tail.catch(() => {
      }).then(() => {
        if (released || this.closed || this.port !== owned) throw new Error("OCR lease closed");
        return port.recognizeLayout(region);
      }).then((layout) => layout, (error) => {
        if (this.port === owned && ocrProcessGone(error)) void this.retire(owned);
        throw error;
      });
      this.tail = request;
      return request;
    };
    return { ...port, recognizeLayout, close: () => {
      if (released) return release ?? Promise.resolve();
      released = true;
      if (this.port !== owned || --this.leases > 0) return Promise.resolve();
      release = this.retire(owned);
      return release;
    } };
  }
  retire(owned) {
    if (this.port !== owned) return this.retiring ?? Promise.resolve();
    this.port = null;
    this.language = "";
    this.leases = 0;
    const work = this.tail;
    const retirement = (async () => {
      const port = await owned.catch(() => null);
      await port?.close();
      await work.catch(() => {
      });
    })().finally(() => {
      if (this.retiring === retirement) this.retiring = null;
    });
    this.retiring = retirement;
    return retirement;
  }
  async close() {
    this.closed = true;
    if (this.port) await this.retire(this.port);
    else await this.retiring;
  }
};

// src/startup-check.ts
function calibrationState(frame, enabled, calibration, fitsBudget) {
  if (!enabled) return { status: "disabled", reason: null };
  if (!calibration) return { status: "missing", reason: "calibration-required" };
  if (!frame) return { status: "pending", reason: null };
  const current = frame.display, saved = calibration.display, a = current.bounds, b = saved.bounds;
  let reason = null;
  if (current.id !== saved.id) reason = "display-changed";
  else if (a.width * b.height !== b.width * a.height) reason = "aspect-changed";
  else if (a.width !== b.width || a.height !== b.height) reason = "resolution-changed";
  else if (current.scaleFactor !== saved.scaleFactor) reason = "scale-changed";
  else if (a.x !== b.x || a.y !== b.y || current.rotation !== saved.rotation || current.name !== saved.name || current.systemNumber !== saved.systemNumber || current.primary !== saved.primary) reason = "geometry-changed";
  else if (frame.topologyRevision !== calibration.topologyRevision) reason = "topology-changed";
  else if (!matchesCalibration(frame, calibration)) reason = "geometry-changed";
  if (!reason && !fitsBudget()) reason = "roi-too-large";
  return { status: reason ? "invalid" : "compatible", reason };
}
function startupCheck(frame, detection, loot) {
  const ratio = frame ? frame.display.bounds.width / frame.display.bounds.height : 0;
  const aspectClass = Math.abs(ratio - 16 / 9) <= 0.01 ? "16:9" : Math.abs(ratio - 16 / 10) <= 0.01 ? "16:10" : Math.abs(ratio - 21 / 9) <= 0.06 ? "21:9" : "other";
  return {
    phase: frame ? "checked" : "pending",
    checkedAt: frame?.capturedAt ?? null,
    source: frame ? {
      displayId: frame.display.id,
      width: frame.display.bounds.width,
      height: frame.display.bounds.height,
      aspectRatio: ratio,
      aspectClass,
      scaleFactor: frame.display.scaleFactor,
      rotation: frame.display.rotation,
      topologyRevision: frame.topologyRevision
    } : null,
    detection: calibrationState(frame, detection.enabled, detection.calibration, () => calibrationFitsBudget(detection.calibration)),
    loot: calibrationState(
      frame,
      loot.enabled,
      loot.calibration ? { ...loot.calibration, roi: loot.calibration.itemsRoi } : null,
      () => lootCalibrationFitsBudget(loot.calibration)
    )
  };
}

// src/engine-ipc.ts
var DELTA_ENGINE_VERSION = 1;

// src/engine-child.ts
var active = false;
var generation = 0;
var source = null;
var latest = null;
var detector = null;
var lootDetector = null;
var ocr = null;
var displayId = "";
var captures = 0;
var captureTimer = null;
var heartbeat = null;
var sampling = Promise.resolve();
var stopped = false;
var send = (message) => {
  if (process.connected) process.send?.(message);
};
async function stop() {
  stopped = true;
  active = false;
  if (captureTimer) clearTimeout(captureTimer);
  if (heartbeat) clearInterval(heartbeat);
  captureTimer = null;
  heartbeat = null;
  await Promise.all([detector?.close(), lootDetector?.close(), ocr?.close()]);
  detector = null;
  lootDetector = null;
  ocr = null;
  await sampling;
  latest = null;
  await source?.close?.();
  source = null;
}
async function start(message) {
  if (active || message.version !== DELTA_ENGINE_VERSION) return;
  generation = message.generation;
  const { settings } = message;
  displayId = settings.displayId;
  const module = await import(settings.frameSourceModule);
  source = await module.createFrameSource();
  if (stopped) {
    await source.close?.();
    source = null;
    return;
  }
  const calibration = settings.detection.calibration;
  const loot = settings.loot ?? DELTA_DEFAULTS.loot;
  ocr = new SharedOcr();
  detector = new Detector(settings.detection, () => source.captureEvidence(displayId, calibration.personalFeedbackRoi ?? calibration.roi), (evidence, match) => {
    if (active) send({
      kind: "event",
      generation,
      requestId: 0,
      id: randomUUID(),
      eventKind: match.kind,
      dedupKey: match.dedupKey,
      synthetic: false,
      capture: evidence.capture,
      crop: evidence.crop,
      cropJpeg: evidence.cropJpeg,
      recognition: match.recognition,
      attribution: match.attribution,
      personalSignature: match.personalSignature
    });
  }, (language) => ocr.open(language));
  lootDetector = new LootDetector(loot, () => source.captureEvidence(displayId, lootCaptureRoi(loot.calibration)), (evidence, match) => {
    if (active) send({
      kind: "event",
      generation,
      requestId: 0,
      id: randomUUID(),
      eventKind: "loot",
      dedupKey: match.dedupKey,
      synthetic: false,
      capture: evidence.capture,
      crop: evidence.crop,
      cropJpeg: evidence.cropJpeg,
      recognition: match.recognition,
      attribution: null,
      lootSignature: match.signature
    });
  }, (language) => ocr.open(language), settings.detection);
  active = true;
  send({ kind: "ready", generation });
  const publish = () => send({
    kind: "heartbeat",
    generation,
    capturedAt: latest?.capturedAt ?? null,
    frame: latest,
    captures,
    detection: detector?.status ?? detectionStatus(settings.detection),
    loot: lootDetector?.status ?? lootStatus(loot, settings.detection),
    lootVisible: latest ? lootDetector?.visible ?? [] : []
  });
  heartbeat = setInterval(publish, settings.heartbeatMs);
  let lastLootAtMs = 0;
  const sample = () => {
    if (!active) return;
    sampling = (async () => {
      try {
        const calibration2 = settings.detection.calibration;
        const detect = !!(settings.detection.enabled && calibration2 && !detector?.status.reason);
        const lootReady = !!(loot.enabled && loot.calibration && !lootDetector?.status.reason);
        const lootDue = lootReady && Date.now() - lastLootAtMs >= DELTA_LOOT_SAMPLE_INTERVAL_MS;
        const rois = detect ? [calibration2.roi, ...calibration2.personalFeedbackRoi ? [calibration2.personalFeedbackRoi] : []] : [];
        if (lootDue && loot.calibration) rois.push(loot.calibration.itemsRoi);
        if (!rois.length) rois.push({ x: 0, y: 0, width: 1e-6, height: 1e-6 });
        const regions = [];
        if (rois.length > 1 && source.captureRois) {
          regions.push(...await source.captureRois(displayId, rois));
          if (!active) return;
          if (regions.length !== rois.length) throw Object.assign(new Error("Incomplete capture"), { code: "captureFailed" });
          captures += regions.length;
        } else for (const roi of rois) {
          regions.push(await source.captureRoi(displayId, roi));
          if (!active) return;
          captures++;
        }
        const region = regions[0];
        const bounds = region.display.bounds, scale = Math.min(1, 1280 / bounds.width, 800 / bounds.height);
        const width = Math.max(1, Math.round(bounds.width * scale)), height = Math.max(1, Math.round(bounds.height * scale));
        latest = {
          frameId: randomUUID(),
          capturedAt: region.capturedAt,
          display: region.display,
          topologyRevision: region.topologyRevision,
          width,
          height,
          mime: "image/jpeg",
          transform: { originX: bounds.x, originY: bounds.y, scaleX: width / bounds.width, scaleY: height / bounds.height }
        };
        let cursor = 0, sampledSource = region;
        const checks = startupCheck(latest, settings.detection, loot);
        if (detect && calibration2) {
          const feed = regions[cursor++];
          if (checks.detection.status === "compatible") {
            sampledSource = feed;
            if (calibration2.personalFeedbackRoi && matchesCalibration(feed, calibration2)) {
              sampledSource = regions[cursor++];
              detector?.submit(sampledSource);
            } else {
              if (calibration2.personalFeedbackRoi) cursor++;
              detector?.submit(feed);
            }
          } else {
            if (calibration2.personalFeedbackRoi) cursor++;
            if (checks.detection.status === "invalid") detector?.submit(feed);
          }
        } else if (checks.detection.status === "invalid") detector?.submit(sampledSource);
        const lootCalibration = loot.calibration;
        const lootSourceMatches = !!lootCalibration && matchesCalibration(sampledSource, { ...lootCalibration, roi: lootCalibration.itemsRoi });
        if (checks.loot.status === "invalid" || loot.enabled && !lootSourceMatches) lootDetector?.submit(sampledSource);
        if (lootReady && lootCalibration && checks.loot.status === "compatible" && lootSourceMatches && Date.now() - lastLootAtMs >= DELTA_LOOT_SAMPLE_INTERVAL_MS) {
          const items = lootDue ? regions[cursor++] : await source.captureRoi(displayId, lootCalibration.itemsRoi);
          if (!lootDue) captures++;
          if (!active) return;
          lastLootAtMs = Date.now();
          lootDetector?.submit(items);
        }
        publish();
        captureTimer = setTimeout(sample, settings.captureIntervalMs);
      } catch (err) {
        if (!active) return;
        latest = null;
        lootDetector?.clearVisible();
        const code = err && typeof err === "object" && "code" in err ? err.code : void 0;
        if (code === "captureTransportFailed" || code === "captureFailed") {
          active = false;
          if (heartbeat) clearInterval(heartbeat);
          send({ kind: "error", generation, reason: "worker-failed", message: String(err) });
        } else {
          send({ kind: "error", generation, reason: "source-unavailable", message: String(err) });
          captureTimer = setTimeout(sample, Math.max(1e3, settings.captureIntervalMs));
        }
      }
    })();
  };
  sample();
}
function simulate(message) {
  if (!active || !latest) return;
  const width = 128, height = 80, rgba = Buffer.alloc(width * height * 4);
  const color = { kill: [180, 40, 20], knockdown: [20, 60, 180], loot: [180, 110, 20] }[message.eventKind];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    rgba[i] = color[0] + x % 30;
    rgba[i + 1] = color[1] + y % 30;
    rgba[i + 2] = color[2];
    rgba[i + 3] = 255;
  }
  const full = import_jpeg_js3.default.encode({ data: rgba, width, height }, 90).data, decoded = import_jpeg_js3.default.decode(full, { useTArray: true });
  const crop = { x: 64, y: 0, width: 64, height: 40 };
  const cropped = copyPixelRect(decoded.data, width, crop.x, crop.y, crop.width, crop.height);
  const display = latest.display;
  send({
    kind: "event",
    generation,
    requestId: message.requestId,
    id: message.eventId,
    eventKind: message.eventKind,
    dedupKey: message.dedupKey,
    synthetic: true,
    recognition: null,
    capture: { jpeg: full, frame: {
      ...latest,
      frameId: randomUUID(),
      capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
      width,
      height,
      transform: { originX: display.bounds.x, originY: display.bounds.y, scaleX: width / display.bounds.width, scaleY: height / display.bounds.height }
    } },
    crop,
    cropJpeg: import_jpeg_js3.default.encode({ data: cropped, width: crop.width, height: crop.height }, 90).data
  });
}
process.on("message", (message) => {
  if (message.kind === "start") void start(message).catch((err) => send({ kind: "error", generation, reason: "worker-failed", message: String(err) }));
  else if (message.kind === "stop") void stop().finally(() => process.exit(0));
  else if (message.kind === "simulate") simulate(message);
  else if (message.kind === "preview" && !active) send({ kind: "preview", generation, requestId: message.requestId, capture: null });
  else if (message.kind === "preview") {
    void source.capture(displayId).then((capture) => {
      if (active) send({ kind: "preview", generation, requestId: message.requestId, capture });
    }).catch(() => {
      if (active) send({ kind: "preview", generation, requestId: message.requestId, capture: null });
    });
  } else if (message.kind === "calibration-suggest" || message.kind === "calibration-source" || message.kind === "calibration-preview" || message.kind === "identity-suggest") {
    const progress = message.kind === "identity-suggest" && message.identityDebug;
    void runCalibrationCapture(message, progress ? (event) => {
      if (process.connected) process.send?.(event);
    } : void 0).then((result) => {
      if (process.connected) process.send?.(result);
    });
  }
});
process.on("disconnect", () => {
  void stop().finally(() => process.exit(0));
});
