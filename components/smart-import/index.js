const { getTodayLocalDate } = require('../../utils/util.js');

const REPORT_TYPES = {
  bloodTest: {
    name: '血常规',
    collection: 'bloodTests',
    indicators: [
      { id: 'wbc', name: '白细胞', unit: '×10⁹/L' },
      { id: 'neut', name: '中性粒细胞数', unit: '×10⁹/L' },
      { id: 'lymph', name: '淋巴细胞绝对值', unit: '×10⁹/L' },
      { id: 'mono', name: '单核细胞绝对值', unit: '×10⁹/L' },
      { id: 'hgb', name: '血红蛋白', unit: 'g/L' },
      { id: 'plt', name: '血小板', unit: '×10⁹/L' },
      { id: 'rbc', name: '红细胞', unit: '×10¹²/L' },
      { id: 'hct', name: '红细胞压积', unit: '%' },
      { id: 'crp', name: 'C反应蛋白', unit: 'mg/L' }
    ]
  },
  liverFunction: {
    name: '肝功能',
    collection: 'liverFunctionTests',
    indicators: [
      { id: 'alt', name: 'ALT', unit: 'U/L' },
      { id: 'ast', name: 'AST', unit: 'U/L' },
      { id: 'tbil', name: '总胆红素', unit: 'μmol/L' },
      { id: 'dbil', name: '直接胆红素', unit: 'μmol/L' },
      { id: 'alb', name: '白蛋白', unit: 'g/L' },
      { id: 'ggt', name: 'GGT', unit: 'U/L' },
      { id: 'alp', name: 'ALP', unit: 'U/L' },
      { id: 'tp', name: '总蛋白', unit: 'g/L' }
    ]
  },
  kidneyFunction: {
    name: '肾功能',
    collection: 'kidneyFunctionTests',
    indicators: [
      { id: 'cr', name: '肌酐', unit: 'μmol/L' },
      { id: 'bun', name: '尿素氮', unit: 'mmol/L' },
      { id: 'ua', name: '尿酸', unit: 'μmol/L' },
      { id: 'egfr', name: 'eGFR', unit: 'mL/min' }
    ]
  }
};

Component({
  data: {
    visible: false,
    loading: false,
    loadingText: 'AI识别中...',
    voiceVisible: false,
    recording: false,
    recordDuration: 0,
    recognizedText: '',
    resultVisible: false,
    resultGroups: []
  },
  methods: {
    show() {
      this.setData({ visible: true });
    },

    onClose() {
      this.setData({ visible: false });
    },

    noop() {},

    onImgError(e) {
      // fallback: if images don't exist, icons are shown via CSS background
    },

    handleCamera() {
      this._chooseImage('camera');
    },

    handleAlbum() {
      this._chooseImage('album');
    },

    _chooseImage(sourceType) {
      this.setData({ visible: false });
      setTimeout(() => {
        wx.chooseImage({
          count: 1,
          sizeType: ['original'],
          sourceType: [sourceType],
          success: (res) => {
            this._processImages(res.tempFilePaths);
          }
        });
      }, 250);
    },

    async _processImages(imagePaths) {
      this.setData({ loading: true, loadingText: '上传图片...' });

      try {
        const allGroups = [];
        const imageUrl = await this._uploadImage(imagePaths[0]);
        this.setData({ loadingText: 'AI智能识别中...' });
        const groups = await this._recognizeImage(imageUrl);
        if (groups && groups.length > 0) {
          allGroups.push(...groups);
        }

        const merged = this._mergeGroups(allGroups);

        if (merged.length === 0) {
          this.setData({ loading: false });
          wx.showToast({ title: '未识别到有效记录项，请确认图片清晰', icon: 'none', duration: 2800 });
          return;
        }

        this.setData({
          loading: false,
          resultGroups: merged,
          resultVisible: true
        });
      } catch (err) {
        this.setData({ loading: false });
        wx.showToast({ title: err.message || '识别失败，请重试', icon: 'none', duration: 2800 });
      }
    },

    _mergeGroups(groups) {
      const map = {};
      groups.forEach(g => {
        if (!g.type || !g.indicators || g.indicators.length === 0) return;
        const key = g.type + '|' + (g.date || '');
        if (!map[key]) {
          map[key] = { type: g.type, typeName: REPORT_TYPES[g.type]?.name || g.type, date: g.date || '', indicators: [] };
        }
        g.indicators.forEach(ind => {
          if (!map[key].indicators.some(x => x.id === ind.id)) {
            map[key].indicators.push(ind);
          }
        });
      });
      return Object.values(map);
    },

    async _recognizeImage(imageUrl) {
      const systemPrompt = `你是医疗报告识别助手。任务：只识别这张图片中实际可见的检验指标，按类型分组输出。

**核心原则（必须严格遵守）**
1. 只输出图片里**真实看到**的指标。看不见、看不清、不确定 → 不要输出。
2. 严禁基于经验或默认模板编造数据。每个数值必须能在图片对应位置找到。
3. 一张图可能只含一种类型（如纯血常规），也可能含多种类型（如肝肾联合）——根据**实际看到的指标**决定输出哪些类型。
4. 不要把指标错位归类。例如：图片只有血常规指标时，绝对不能输出 liverFunction 或 kidneyFunction。

**类型与指标白名单**

bloodTest（血常规）：
- wbc(白细胞,×10⁹/L) / neut(中性粒细胞绝对值#,×10⁹/L,不取%) / lymph(淋巴细胞绝对值#,×10⁹/L) / mono(单核绝对值#,×10⁹/L)
- hgb(血红蛋白,g/L) / plt(血小板,×10⁹/L) / rbc(红细胞,×10¹²/L) / hct(红细胞压积,%)
- crp(C反应蛋白,mg/L)

liverFunction（肝功能）：
- alt(ALT/谷丙,U/L) / ast(AST/谷草,U/L) / tbil(总胆红素,μmol/L) / dbil(直接胆红素,μmol/L)
- alb(白蛋白,g/L) / ggt(GGT,U/L) / alp(ALP/碱性磷酸酶,U/L) / tp(总蛋白,g/L)

kidneyFunction（肾功能）：
- cr(肌酐,μmol/L) / bun(尿素氮,mmol/L) / ua(尿酸,μmol/L) / egfr(eGFR,mL/min)

**输出 JSON 示例**

例1（图中只有血常规）：
{"groups":[{"type":"bloodTest","date":"2025-03-15","indicators":[{"id":"wbc","label":"白细胞","value":"5.76","unit":"×10⁹/L"},{"id":"hgb","label":"血红蛋白","value":"135","unit":"g/L"},{"id":"plt","label":"血小板","value":"210","unit":"×10⁹/L"}]}]}

例2（图中只有肝功能）：
{"groups":[{"type":"liverFunction","date":"2025-03-15","indicators":[{"id":"alt","label":"ALT","value":"22","unit":"U/L"},{"id":"ast","label":"AST","value":"25","unit":"U/L"}]}]}

例3（图中只有肾功能）：
{"groups":[{"type":"kidneyFunction","date":"2025-03-15","indicators":[{"id":"cr","label":"肌酐","value":"68","unit":"μmol/L"},{"id":"bun","label":"尿素氮","value":"4.5","unit":"mmol/L"}]}]}

例4（图中同时有肝功能和肾功能联合检查）：
{"groups":[{"type":"liverFunction","date":"2025-03-15","indicators":[{"id":"alt","label":"ALT","value":"22","unit":"U/L"}]},{"type":"kidneyFunction","date":"2025-03-15","indicators":[{"id":"cr","label":"肌酐","value":"68","unit":"μmol/L"}]}]}

**绝对禁止的输出**：
- 图中没有肌酐/尿素氮/尿酸 → 严禁出现 kidneyFunction
- 图中没有 ALT/AST/胆红素 → 严禁出现 liverFunction
- 图中没有 WBC/HGB/PLT → 严禁出现 bloodTest
- value 为空、0、未知 → 整个该指标必须省略，不要写 value:"0" 或 value:""

**日期识别**：从图中提取检验/采样/报告日期，格式 YYYY-MM-DD。找不到 → date 设为 ""。

只输出 JSON，不要任何其他文字、解释或代码块标记。`;

      const res = await wx.cloud.callFunction({
        name: 'callSiliconFlowAI',
        data: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: [
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
              { type: 'text', text: '识别这张医疗报告。只输出图中实际看到的指标。' }
            ]}
          ],
          mode: 'unified', stream: false, temperature: 0.1, max_tokens: 4096
        },
        config: { timeout: 60000 }
      });

      if (!res.result || res.result.success === false) {
        throw new Error(res.result?.error || 'AI响应失败');
      }
      const aiText = res.result.reply || res.result.content;
      if (!aiText) throw new Error('AI响应为空');
      return this._parseAI(aiText);
    },

    _parseAI(text) {
      let jsonStr = null;
      const m = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (m) { jsonStr = m[1]; }
      else {
        const s = text.indexOf('{'), e = text.lastIndexOf('}');
        if (s !== -1 && e > s) jsonStr = text.substring(s, e + 1);
      }
      if (!jsonStr) throw new Error('无法识别该报告，请确认图片内容');
      jsonStr = jsonStr.trim();
      if (jsonStr.charCodeAt(0) === 0xFEFF) jsonStr = jsonStr.substring(1);

      let parsed;
      try { parsed = JSON.parse(jsonStr); } catch(e) {
        parsed = this._repairJSON(jsonStr);
        if (!parsed) throw new Error('识别结果解析失败');
      }

      let groups = [];
      if (Array.isArray(parsed.groups)) {
        groups = parsed.groups;
      } else if (parsed.type) {
        groups = [{ type: parsed.type, date: parsed.date || '', indicators: parsed.indicators || [] }];
      }

      return groups.map(g => {
        const cfg = REPORT_TYPES[g.type];
        let indicators = g.indicators || [];
        if (cfg) {
          indicators = indicators
            .filter(i => cfg.indicators.some(c => c.id === i.id))
            .filter(i => {
              if (i.value === undefined || i.value === null) return false;
              const v = String(i.value).trim();
              if (v === '' || v === '0' || v === '0.0' || v === '0.00') return false;
              if (!/^-?\d+(\.\d+)?$/.test(v)) return false;
              return true;
            })
            .map(i => {
              const c = cfg.indicators.find(x => x.id === i.id);
              return { ...i, label: c ? c.name : i.label, unit: i.unit || (c ? c.unit : '') };
            });
        }
        return { type: g.type, date: g.date || '', indicators };
      }).filter(g => g.indicators.length > 0);
    },

    // === Voice ===
    handleVoice() {
      this.setData({ visible: false });
      setTimeout(() => {
        this._checkRecordAuth().then(ok => {
          if (!ok) return;
          this.setData({ voiceVisible: true, recording: false, recordDuration: 0, recognizedText: '' });
          this._initVoice();
        });
      }, 250);
    },

    _checkRecordAuth() {
      return new Promise((resolve) => {
        wx.getSetting({
          success: (res) => {
            if (res.authSetting['scope.record'] === false) {
              wx.showModal({
                title: '需要麦克风权限',
                content: '语音录入需要使用麦克风，请在设置中开启',
                confirmText: '去设置',
                success: (m) => {
                  if (m.confirm) {
                    wx.openSetting();
                  }
                  resolve(false);
                }
              });
            } else {
              resolve(true);
            }
          },
          fail: () => resolve(true)
        });
      });
    },

    _initVoice() {
      try {
        const plugin = requirePlugin('WechatSI');
        const mgr = plugin.getRecordRecognitionManager();
        this._vm = mgr;
        mgr.onStart = () => {
          console.log('[smart-import] 录音开始');
          this.setData({ recording: true });
          this._startTimer();
        };
        mgr.onRecognize = (r) => {
          this.setData({ recognizedText: r.result || '' });
        };
        mgr.onStop = (r) => {
          console.log('[smart-import] 录音结束:', r);
          this._stopTimer();
          this.setData({ recording: false });
          const text = r && r.result ? r.result.trim() : '';
          if (text) {
            this.setData({ voiceVisible: false });
            this._processVoice(text);
          } else {
            wx.showToast({ title: '未识别到内容，请再试一次', icon: 'none', duration: 2200 });
          }
        };
        mgr.onError = (err) => {
          console.error('[smart-import] 语音识别错误:', err);
          this._stopTimer();
          this.setData({ recording: false });
          const msg = err && err.msg ? `识别失败: ${err.msg}` : '语音识别失败，请重试';
          wx.showToast({ title: msg, icon: 'none', duration: 2500 });
        };
      } catch (e) {
        console.error('[smart-import] 插件初始化失败:', e);
        wx.showToast({ title: '语音插件未启用', icon: 'none' });
        this.setData({ voiceVisible: false });
      }
    },

    toggleVoice() {
      if (!this._vm) {
        wx.showToast({ title: '语音模块未就绪', icon: 'none' });
        return;
      }
      if (!this.data.recording) {
        try {
          this._vm.start({ lang: 'zh_CN', duration: 60000 });
        } catch (e) {
          console.error('[smart-import] 开始录音失败:', e);
          wx.showToast({ title: '无法开始录音', icon: 'none' });
        }
      } else {
        try { this._vm.stop(); } catch (e) { console.error(e); }
      }
    },

    cancelVoice() {
      if (this._vm && this.data.recording) {
        try { this._vm.stop(); } catch (e) {}
      }
      this._stopTimer();
      this.setData({ recording: false, voiceVisible: false, recordDuration: 0, recognizedText: '' });
    },

    onVoiceClose() {
      if (this.data.recording) this.cancelVoice();
      else this.setData({ voiceVisible: false });
    },

    async _processVoice(text) {
      this.setData({ loading: true, loadingText: 'AI解析中...' });
      try {
        const prompt = `你是医疗数据识别助手。从用户语音中提取检验指标。可能同时包含多个类型（如肝肾功能），必须分组输出。

类型：bloodTest/liverFunction/kidneyFunction
指标映射：白细胞→wbc, 血红蛋白→hgb, 血小板→plt, 中性粒细胞→neut, 淋巴细胞→lymph, 单核细胞→mono, CRP→crp, 红细胞→rbc, 红细胞压积→hct, ALT→alt, AST→ast, 总胆红素→tbil, 直接胆红素→dbil, 白蛋白→alb, GGT→ggt, ALP→alp, 肌酐→cr, 尿素氮→bun, 尿酸→ua, eGFR→egfr
"点"=小数点，中文数字转阿拉伯数字。如提到日期则提取为YYYY-MM-DD。

输出JSON（仅JSON）：
{"groups":[{"type":"bloodTest","date":"","indicators":[{"id":"wbc","label":"白细胞","value":"5.2","unit":"×10⁹/L"}]}]}`;

        const res = await wx.cloud.callFunction({
          name: 'callSiliconFlowAI',
          data: {
            messages: [{ role: 'system', content: prompt }, { role: 'user', content: text }],
            mode: 'unified', stream: false, temperature: 0, max_tokens: 2048
          },
          config: { timeout: 15000 }
        });
        if (!res.result || res.result.success === false) throw new Error('AI解析失败');
        const aiText = res.result.reply || res.result.content;
        if (!aiText) throw new Error('AI响应为空');
        const groups = this._parseAI(aiText);
        const merged = this._mergeGroups(groups);

        if (merged.length === 0) {
          this.setData({ loading: false });
          wx.showToast({ title: '未识别到有效数据', icon: 'none' });
          return;
        }
        this.setData({
          loading: false,
          resultGroups: merged,
          resultVisible: true
        });
      } catch (err) {
        this.setData({ loading: false });
        wx.showToast({ title: err.message || '解析失败', icon: 'none' });
      }
    },

    // === Result ===
    onValueEdit(e) {
      const { gi, ii } = e.currentTarget.dataset;
      this.setData({ [`resultGroups[${gi}].indicators[${ii}].value`]: e.detail.value });
    },

    closeResult() { this.setData({ resultVisible: false, resultGroups: [] }); },
    onResultClose() { this.closeResult(); },

    async saveResult() {
      const { resultGroups } = this.data;
      const app = getApp();
      const openid = app.globalData.openid;
      const profileId = app.globalData.currentProfile?.profileId || app.getCurrentProfileId();

      if (!openid || !profileId) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
      if (!resultGroups || resultGroups.length === 0) return;

      const db = wx.cloud.database();
      let totalSaved = 0;
      let typesSaved = [];

      wx.showLoading({ title: '保存中...', mask: true });
      try {
        for (const group of resultGroups) {
          const cfg = REPORT_TYPES[group.type];
          if (!cfg) continue;

          const saveDate = group.date || getTodayLocalDate();
          const col = db.collection(cfg.collection);
          const existing = await col.where({ _openid: openid, profileId, date: saveDate }).get();

          const saveData = { openid, profileId, date: saveDate };
          let count = 0;
          group.indicators.forEach(i => {
            if (i.value && String(i.value).trim()) {
              saveData[i.id] = String(i.value).trim();
              count++;
            }
          });

          if (count === 0) continue;

          if (existing.data && existing.data.length > 0) {
            const old = existing.data[0];
            cfg.indicators.forEach(ind => { if (!saveData[ind.id] && old[ind.id]) saveData[ind.id] = old[ind.id]; });
            await col.doc(old._id).update({ data: saveData });
          } else {
            await col.add({ data: saveData });
          }
          totalSaved += count;
          typesSaved.push(cfg.name);
        }

        wx.hideLoading();
        this.setData({ resultVisible: false, resultGroups: [] });
        app.globalData.needRefreshData = true;
        app.globalData.shouldRefreshChart = true;

        if (totalSaved === 0) {
          wx.showToast({ title: '没有有效数据可保存', icon: 'none' });
          return;
        }
        wx.showToast({
          title: `已保存${totalSaved}项 (${typesSaved.join('、')})`,
          icon: 'success',
          duration: 2500
        });

        // 通知当前页面立即刷新（如果实现了 onSmartImportSaved）
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        if (currentPage && typeof currentPage.onSmartImportSaved === 'function') {
          currentPage.onSmartImportSaved({ totalSaved, types: typesSaved });
        }
      } catch (err) {
        console.error('[smart-import] 保存失败:', err);
        wx.hideLoading();
        wx.showToast({ title: err.message || '保存失败', icon: 'none' });
      }
    },

    // === Utilities ===
    _uploadImage(path) {
      return new Promise((resolve, reject) => {
        const cloudPath = `smart-import/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        wx.cloud.uploadFile({
          cloudPath, filePath: path,
          success: async (r) => {
            try {
              const t = await wx.cloud.getTempFileURL({ fileList: [r.fileID] });
              if (t.fileList && t.fileList[0]) resolve(t.fileList[0].tempFileURL);
              else reject(new Error('获取URL失败'));
            } catch(e) { reject(e); }
          },
          fail: reject
        });
      });
    },

    _startTimer() {
      this._stopTimer();
      this._timer = setInterval(() => { this.setData({ recordDuration: this.data.recordDuration + 1 }); }, 1000);
    },
    _stopTimer() { if (this._timer) { clearInterval(this._timer); this._timer = null; } },

    _repairJSON(str) {
      if (!str) return null;
      try { return JSON.parse(str); } catch(e) {}
      let b = 0, k = 0, inS = false, esc = false;
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') { inS = !inS; continue; }
        if (inS) continue;
        if (c === '{') b++; else if (c === '}') b--;
        if (c === '[') k++; else if (c === ']') k--;
      }
      let r = str;
      for (let i = 0; i < k; i++) r += ']';
      for (let i = 0; i < b; i++) r += '}';
      try { return JSON.parse(r); } catch(e) { return null; }
    }
  }
});
