<template>
  <div class="page-container batch-gen">
    <PageHero
      title="AI 批量生图"
      subtitle="批量生成 A 图 → 多选锚点 → 批量生成多套 B 五宫格 + C 产品信息图"
      :image="PLACEHOLDERS.batchImage"
      badge="AI Generate"
    />

    <WorkflowGuide
      title="本页操作顺序"
      subtitle="点击卡片可跳转；勾选锚点请点缩略图或复选框，不要用预览按钮"
      :steps="BATCH_IMAGE_WORKFLOW"
      :active-step="workflowActiveStep"
    />

    <div class="card-section api-config-panel">
      <div class="config-head">
        <div>
          <h3 class="section-title">
            <el-icon><Setting /></el-icon>
            文生图 API 配置
          </h3>
          <p class="config-sub">配置保存在 <code>backend/.env</code>，修改后需重启后端</p>
        </div>
        <div class="config-head-actions">
          <el-tag :type="apiConfigured ? 'success' : 'danger'" size="large" effect="dark">
            {{ apiConfigured ? '已配置，可正常生图' : '未配置' }}
          </el-tag>
          <el-button text type="primary" @click="apiConfigExpanded = !apiConfigExpanded">
            {{ apiConfigExpanded ? '收起说明' : '展开说明' }}
            <el-icon><component :is="apiConfigExpanded ? 'ArrowUp' : 'ArrowDown'" /></el-icon>
          </el-button>
        </div>
      </div>

      <el-descriptions v-if="apiConfigExpanded && imageGenSettings" :column="1" border class="config-desc">
        <el-descriptions-item label="接口地址">
          {{ imageGenSettings.apiBaseUrl || '（空，请在 .env 填写 IMAGE_GEN_API_BASE_URL）' }}
        </el-descriptions-item>
        <el-descriptions-item label="API Key">
          {{ imageGenSettings.apiKey || '（空，请在 .env 填写 IMAGE_GEN_API_KEY）' }}
        </el-descriptions-item>
        <el-descriptions-item label="模型">gpt-image-2（固定）</el-descriptions-item>
      </el-descriptions>

      <template v-if="apiConfigExpanded">
        <div class="env-template">
          <div class="env-template-title">在 <code>backend/.env</code> 中添加或修改：</div>
          <pre class="env-code"># AI 批量文生图
IMAGE_GEN_API_BASE_URL=https://你的API网关地址
IMAGE_GEN_API_KEY=你的API密钥</pre>
          <p class="env-note">
            也支持旧变量名 <code>API_BASE_URL</code> / <code>API_KEY</code>，保存后重启后端。
          </p>
        </div>
      </template>
      <p v-else-if="!apiConfigured" class="config-collapsed-hint">
        未配置时请点击「展开说明」查看 <code>backend/.env</code> 填写方式，或前往
        <router-link to="/settings?tab=imageGen">系统设置</router-link>。
      </p>

      <div class="config-actions">
        <router-link to="/settings?tab=imageGen">
          <el-button><el-icon><Setting /></el-icon> 查看系统设置</el-button>
        </router-link>
        <el-button type="primary" plain @click="refreshApiStatus">
          <el-icon><Refresh /></el-icon> 刷新状态
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="!apiConfigured"
      title="文生图 API 未配置，请先填写上方接口信息"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />

    <div class="card-section gen-options-panel">
      <h3 class="section-title">出图选项</h3>
      <p class="field-hint" style="margin-bottom: 16px">
        颜色/形状/风格作用于批量 A 图；选「随机」时多张图会自动黑白混色、形状抽卡、风格混搭
      </p>

      <el-form label-width="90px">
        <el-form-item label="颜色款">
          <div class="chip-group">
            <el-button
              v-for="c in COLOR_OPTIONS"
              :key="c.id"
              size="small"
              :type="genOptions.colorKey === c.id ? 'primary' : 'default'"
              @click="genOptions.colorKey = c.id"
            >
              {{ c.label }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="形状分类">
          <div class="chip-group">
            <el-button
              size="small"
              :type="genOptions.shapeCategory === 'regular' ? 'primary' : 'default'"
              @click="onShapeCategoryChange('regular')"
            >
              常规
            </el-button>
            <el-button
              size="small"
              :type="genOptions.shapeCategory === 'irregular' ? 'primary' : 'default'"
              @click="onShapeCategoryChange('irregular')"
            >
              异形
            </el-button>
          </div>
          <div class="chip-group">
            <el-button
              v-for="s in currentShapeOptions"
              :key="s.id"
              size="small"
              :type="genOptions.shapeKey === s.id ? 'primary' : 'default'"
              @click="genOptions.shapeKey = s.id"
            >
              {{ s.label }}
            </el-button>
          </div>
          <p class="field-hint">
            常规：长方形、正方形；异形：圆形、五角星、梯形、不规则；随机为形状抽卡
          </p>
        </el-form-item>

        <el-form-item label="出图风格">
          <div class="chip-group">
            <el-button
              v-for="st in STYLE_OPTIONS"
              :key="st.id"
              size="small"
              :type="genOptions.styleKey === st.id ? 'primary' : 'default'"
              @click="genOptions.styleKey = st.id"
            >
              {{ st.label }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="文字">
          <div class="chip-group">
            <span class="chip-group-label">颜色</span>
            <el-button
              v-for="tc in TEXT_COLOR_OPTIONS"
              :key="tc.id"
              size="small"
              :type="genOptions.textColorKey === tc.id ? 'primary' : 'default'"
              @click="genOptions.textColorKey = tc.id"
            >
              {{ tc.label }}
            </el-button>
          </div>
          <div class="chip-group" style="margin-top: 8px">
            <span class="chip-group-label">字体</span>
            <el-button
              v-for="f in FONT_OPTIONS"
              :key="f.id"
              size="small"
              :type="genOptions.fontKey === f.id ? 'primary' : 'default'"
              @click="genOptions.fontKey = f.id"
            >
              {{ f.label }}
            </el-button>
          </div>
          <p class="field-hint">作用于 C 图叠加的产品分类、尺寸、产品信息文字</p>
        </el-form-item>
      </el-form>
    </div>

    <div class="card-section">
      <el-form label-width="90px" @submit.prevent="handleSubmit">
        <el-form-item label="图片描述" required>
          <el-input
            v-model="form.prompt"
            type="textarea"
            :rows="4"
            placeholder="例如：端午礼盒产品实拍，中式风格，暖色调，高清"
          />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="生成数量">
              <el-input-number
                v-model="form.count"
                :min="1"
                :max="maxCount"
                controls-position="right"
                style="width: 100%"
              />
              <div class="field-hint">范围 1–{{ maxCount }}，先批量生成再选锚点</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="图片尺寸">
              <el-select v-model="form.size" style="width: 100%">
                <el-option label="1:1（方形）" value="1:1" />
                <el-option label="16:9（横屏）" value="16:9" />
                <el-option label="9:16（竖屏）" value="9:16" />
                <el-option label="4:3（横屏）" value="4:3" />
                <el-option label="3:4（竖屏）" value="3:4" />
                <el-option label="3:2（横屏）" value="3:2" />
                <el-option label="2:3（竖屏）" value="2:3" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            :disabled="!apiConfigured || !form.prompt.trim()"
            @click="handleSubmit"
          >
            {{ loading ? '正在生成...' : '开始批量生成' }}
          </el-button>
          <el-button
            v-if="loading || generatingAbc"
            type="danger"
            plain
            @click="cancelGeneration"
          >
            取消生成
          </el-button>
          <el-button v-if="generatedImages.length && !loading" @click="resetAll">清空结果</el-button>
        </el-form-item>

        <el-progress
          v-if="loading && progress.total"
          :percentage="progressPercent"
          :format="() => progressText"
          style="margin-top: 8px"
        />
        <p v-if="statusMessage" class="status-msg">{{ statusMessage }}</p>
      </el-form>
    </div>

    <el-alert
      v-if="hasRestoredWork"
      title="已恢复上次生成内容，切换页面不会丢失（关闭浏览器标签后需重新生成）"
      type="success"
      :closable="true"
      show-icon
      style="margin-bottom: 16px"
      @close="hasRestoredWork = false"
    />

    <!-- ABC 锚点生成面板 -->
    <div v-if="generatedImages.length || materialAnchor" class="card-section abc-panel">
      <div class="section-title">ABC 套装生成</div>
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
        <template v-if="materialAnchor">
          已从<strong>素材库 A 图</strong>加载锚点，填写产品信息后一键生成
          <strong>B（宫格）</strong> + <strong>C（产品信息图）</strong>，完成后<strong>自动调用 DeepSeek 生成种草文案</strong>。
        </template>
        <template v-else>
          勾选锚点 A 后一键生成 B（2～5 宫格）+ C（原图叠加产品信息），完成后<strong>自动调用 DeepSeek</strong> 生成好物推荐文案（标题、正文、标签、多 emoji）。也可点击套装 A 图手动刷新文案。
        </template>
      </el-alert>

      <div v-if="anchorImage" class="anchor-preview">
        <img :src="anchorImage.dataUrl" alt="锚点 A" />
        <div class="anchor-info">
          <el-tag type="danger" effect="dark">锚点 A</el-tag>
          <span v-if="anchorImage.source === 'material'">
            素材库 · {{ anchorImage.filename || anchorImage.path }}
          </span>
          <span v-else>第 {{ anchorImage.id }} 张 · {{ anchorImage.prompt?.slice(0, 40) }}...</span>
          <div class="anchor-actions">
            <el-button size="small" plain @click="downloadSingleImage(anchorImage)">
              下载锚点图
            </el-button>
            <el-button size="small" type="primary" plain :loading="zipping" @click="downloadZip">
              下载锚点 ZIP
            </el-button>
          </div>
        </div>
      </div>
      <p v-else class="anchor-hint">← 请先在下方勾选一张或多张图片作为锚点 A</p>
      <p v-if="batchAnchorList.length > 1" class="anchor-hint batch-count">
        已选 {{ batchAnchorList.length }} 个锚点，将按顺序批量生成 {{ batchAnchorList.length }} 套 B+C
      </p>

      <el-form label-width="100px" class="abc-form">
        <el-form-item label="产品分类" required>
          <div class="chip-group">
            <el-button
              v-for="cat in PRODUCT_CATEGORIES"
              :key="cat.id"
              size="small"
              :type="abcForm.categoryKey === cat.id ? 'primary' : 'default'"
              @click="selectCategory(cat.id)"
            >
              {{ cat.label }}
            </el-button>
            <el-button
              size="small"
              :type="abcForm.categoryKey === 'custom' ? 'primary' : 'default'"
              @click="selectCategory('custom')"
            >
              自定义
            </el-button>
          </div>
          <el-select
            v-if="abcForm.categoryKey === 'custom'"
            v-model="abcForm.categoryCustom"
            class="history-select"
            filterable
            allow-create
            default-first-option
            clearable
            placeholder="输入或选择历史自定义分类"
            @change="onCategoryCustomPick"
            @blur="persistAbcHistory"
          >
            <el-option v-for="item in categoryHistory" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>

        <el-form-item label="产品尺寸">
          <div v-if="abcForm.categoryKey !== 'custom'" class="chip-group">
            <el-button
              size="small"
              :type="abcForm.dimensionsMode === 'preset' ? 'primary' : 'default'"
              @click="selectDimensionsPreset"
            >
              {{ currentCategoryDefaultDimensions }}
            </el-button>
            <el-button
              size="small"
              :type="abcForm.dimensionsMode === 'custom' ? 'primary' : 'default'"
              @click="selectDimensionsCustom"
            >
              自定义
            </el-button>
          </div>
          <el-select
            v-if="abcForm.dimensionsMode === 'custom' || abcForm.categoryKey === 'custom'"
            v-model="abcForm.productDimensions"
            class="history-select"
            filterable
            allow-create
            default-first-option
            clearable
            placeholder="输入或选择历史尺寸，例：长 25cm × 宽 18cm"
            @change="onDimensionsPick"
            @blur="persistAbcHistory"
          >
            <el-option v-for="item in dimensionsHistory" :key="item" :label="item" :value="item" />
          </el-select>
          <div v-else class="field-hint">当前尺寸：{{ abcForm.productDimensions }}</div>
        </el-form-item>

        <el-form-item label="产品信息">
          <el-input
            v-model="abcForm.productInfo"
            type="textarea"
            :rows="3"
            :placeholder="productInfoPlaceholder"
            @blur="onProductInfoBlur"
          />
          <p class="field-hint seed-paper-hint">
            所有分类共用产品信息：产品名种子纸，成分 {{ SEED_PAPER_COMPOSITION }}，特性环保可降解、只内嵌入种植植物种子（可修改）
          </p>
          <p class="field-hint">产品尺寸会写入 C 图（第三章）展示，可点「自定义」修改</p>
        </el-form-item>
        <el-form-item label="B 图宫格">
          <div class="chip-group">
            <el-button
              v-for="opt in B_GRID_OPTIONS"
              :key="opt.count"
              size="small"
              :type="abcForm.bGridMode === 'preset' && abcForm.bGridCount === opt.count ? 'primary' : 'default'"
              @click="selectBGridPreset(opt.count)"
            >
              {{ opt.label }}
            </el-button>
            <el-button
              size="small"
              :type="abcForm.bGridMode === 'random' ? 'primary' : 'default'"
              @click="selectBGridRandom"
            >
              随机
            </el-button>
            <el-button
              size="small"
              :type="abcForm.bGridMode === 'custom' ? 'primary' : 'default'"
              @click="selectBGridCustom"
            >
              自定义
            </el-button>
          </div>
          <div v-if="abcForm.bGridMode === 'custom'" class="custom-grid-row">
            <el-input-number
              v-model="abcForm.bGridCustomCount"
              :min="2"
              :max="9"
              controls-position="right"
              style="width: 120px"
            />
            <span class="field-hint inline">格数（2～9）</span>
            <el-input
              v-model="abcForm.bGridCustomLayout"
              placeholder="可选：排版描述，如「上2下3」或「2行3列」"
              style="flex: 1; min-width: 200px"
            />
          </div>
          <div class="field-hint">{{ bGridPreviewHint }}</div>
        </el-form-item>

        <el-form-item label="种植方法">
          <div class="planting-toggle-row">
            <el-checkbox v-model="abcForm.enablePlantingMethod">
              在 B 图最后一格生成真实感种植/使用场景
            </el-checkbox>
          </div>
          <el-input
            v-if="abcForm.enablePlantingMethod"
            v-model="abcForm.plantingMethod"
            type="textarea"
            :rows="2"
            placeholder="可选：补充种植步骤说明，如「湿润土壤埋入种子纸，每日喷水」"
            style="margin-top: 8px"
          />
          <p v-if="abcForm.enablePlantingMethod" class="field-hint">
            将占用 B 图第 {{ currentGridLayout.plantingCell }} 格，其余格仍为 A 图同款产品多角度
          </p>
        </el-form-item>

        <el-form-item label="C 图尺寸">
          <el-select v-model="abcForm.cSize" style="width: 200px">
            <el-option label="3:4（竖屏，推荐）" value="3:4" />
            <el-option label="9:16（竖屏）" value="9:16" />
            <el-option label="1:1（方形）" value="1:1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            v-if="batchAnchorList.length <= 1"
            type="primary"
            :loading="generatingAbc"
            :disabled="!batchAnchorList.length"
            @click="handleGenerateAbc"
          >
            {{ generatingAbc ? '正在生成 B + C + 文案...' : '生成全套（B+C+种草文案）' }}
          </el-button>
          <el-button
            v-else
            type="primary"
            :loading="generatingAbc"
            :disabled="!batchAnchorList.length"
            @click="handleGenerateAbc"
          >
            {{ generatingAbc ? `批量生成中 (${abcBatchProgress})...` : `批量生成全套（${batchAnchorList.length} 套）` }}
          </el-button>
          <el-button
            v-if="generatingAbc"
            type="danger"
            plain
            @click="cancelGeneration"
          >
            取消生成
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 宫格示意 -->
      <div class="grid-demo">
        <span class="demo-label">
          B 图 · {{ currentGridLayout.label }}
          <template v-if="abcForm.enablePlantingMethod">（第 {{ currentGridLayout.plantingCell }} 格为种植场景）</template>
        </span>
        <div class="grid-layout" :class="currentGridLayout.gridClass">
          <div
            v-for="cell in currentGridLayout.cells"
            :key="cell.n"
            class="grid5-cell"
            :class="{ method: abcForm.enablePlantingMethod && cell.n === currentGridLayout.plantingCell }"
          >
            <span>{{ cell.n }}</span>
            <small>
              {{ abcForm.enablePlantingMethod && cell.n === currentGridLayout.plantingCell ? '种植' : cell.short }}
            </small>
          </div>
        </div>
      </div>
    </div>

    <!-- ABC 套装结果（按分类分组） -->
    <template v-for="group in groupedAbcSets" :key="group.category">
      <div class="card-section abc-group-header">
        <div class="section-title">{{ group.category }}</div>
        <el-tag type="info" effect="plain">{{ group.sets.length }} 套</el-tag>
      </div>
      <div v-for="set in group.sets" :key="`${group.category}-${set.setIndex}`" class="card-section abc-set-card">
      <div class="set-header">
        <div class="set-header-left">
          <span class="section-title">套装 #{{ set.setIndex }}</span>
          <el-tag size="small" effect="plain">{{ set.productCategory || group.category }}</el-tag>
          <el-tag v-if="set.bGridCount || set.bGridMode === 'random'" size="small" type="warning" effect="plain">
            {{ bGridLabel(set.bGridCount || abcForm.bGridCount, set.enablePlantingMethod, set.bGridMode) }}
          </el-tag>
        </div>
        <div class="set-header-actions">
          <el-button
            v-if="set.anchor && set.b && set.c"
            type="success"
            size="small"
            plain
            :loading="copyingSetId === set.setIndex"
            @click="generateViralCopyForSet(set)"
          >
            {{ set.viralCopy?.title ? '重新生成文案' : '生成种草文案' }}
          </el-button>
          <el-button type="primary" size="small" :loading="savingSetId === set.setIndex" @click="saveAbcSet(set)">
            保存为 a{{ set.setIndex }} / b{{ set.setIndex }} / c{{ set.setIndex }}
          </el-button>
        </div>
      </div>
      <div class="abc-row">
        <div class="abc-slot anchor-slot" @click="onSetAnchorClick(set)">
          <span class="slot-tag a">A · 锚点</span>
          <el-image :src="set.anchor.dataUrl" fit="cover" class="slot-img" :preview-src-list="[set.anchor.dataUrl]" @click.stop />
          <el-button size="small" text type="primary" @click.stop="downloadSingleImage(set.anchor)">下载</el-button>
          <p v-if="set.b && set.c" class="slot-hint">点击卡片 → DeepSeek 种草文案</p>
        </div>
        <div class="abc-slot">
          <span class="slot-tag b">{{ bGridLabel(set.bGridCount || abcForm.bGridCount, set.enablePlantingMethod, set.bGridMode) }}</span>
          <el-image v-if="set.b" :src="set.b.dataUrl" fit="cover" class="slot-img" :preview-src-list="[set.b.dataUrl]" />
          <div v-else class="slot-loading"><el-icon class="is-loading"><Loading /></el-icon></div>
          <el-button v-if="set.b" size="small" text type="primary" @click="downloadSingleImage(set.b)">下载</el-button>
        </div>
        <div class="abc-slot">
          <span class="slot-tag c">C · 原图信息</span>
          <el-image v-if="set.c" :src="set.c.dataUrl" fit="cover" class="slot-img" :preview-src-list="[set.c.dataUrl]" />
          <div v-else class="slot-loading"><el-icon class="is-loading"><Loading /></el-icon></div>
          <el-button v-if="set.c" size="small" text type="primary" @click="downloadSingleImage(set.c)">下载</el-button>
        </div>
      </div>

      <div v-if="copyingSetId === set.setIndex" class="viral-copy-block viral-copy-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>DeepSeek 正在分析 A/B/C 配图，生成好物推荐文案（标题 · 正文 · 标签 · 多 emoji）...</span>
      </div>
      <div v-else-if="set.viralCopy?.title || set.viralCopy?.content" class="viral-copy-block">
        <div class="viral-copy-head">
          <span class="section-title">热门种草文案</span>
          <el-tag v-if="set.viralCopy.mock" size="small" type="warning" effect="plain">模板模式</el-tag>
          <el-button size="small" text type="primary" @click="goPublishWithCopy(set)">去发布</el-button>
        </div>
        <div class="viral-copy-row">
          <span class="viral-label">标题</span>
          <p class="viral-text">{{ set.viralCopy.title }}</p>
          <el-button text type="primary" size="small" @click="copyText(set.viralCopy.title)">复制</el-button>
        </div>
        <div class="viral-copy-row block">
          <span class="viral-label">正文</span>
          <el-input v-model="set.viralCopy.content" type="textarea" :rows="8" />
          <el-button text type="primary" size="small" @click="copyText(set.viralCopy.content)">复制正文</el-button>
        </div>
        <div class="viral-copy-row">
          <span class="viral-label">标签</span>
          <div class="viral-tags">
            <el-tag v-for="(t, i) in set.viralCopy.tags" :key="i" size="small" style="margin: 3px">{{ t }}</el-tag>
          </div>
          <el-button text type="primary" size="small" @click="copyText((set.viralCopy.tags || []).join(' '))">
            复制标签
          </el-button>
        </div>
      </div>
    </div>
    </template>

    <div v-if="hasDownloadableImages" class="card-section">
      <div class="section-title">
        生成结果（锚点 {{ anchorCandidateCount }} 张 · 共 {{ generatedImages.length }} 张）
        <span v-if="selectedAnchorIds.length > 1" class="select-hint">
          已选 {{ selectedAnchorIds.length }} 个锚点：第 {{ selectedAnchorIds.join('、') }} 张
        </span>
        <span v-else-if="selectedAnchorId && selectedAnchorId !== 'material'" class="select-hint">
          已选锚点：第 {{ selectedAnchorId }} 张
        </span>
        <span v-else-if="selectedAnchorId === 'material'" class="select-hint">已选素材库锚点</span>
      </div>

      <div class="toolbar">
        <el-button
          v-if="anchorCandidateImages.length > 1"
          size="small"
          @click="selectAllAnchorCandidates"
        >
          全选锚点候选
        </el-button>
        <el-button
          v-if="selectedAnchorIds.length"
          size="small"
          @click="clearAnchorSelection"
        >
          清空勾选
        </el-button>
        <el-button type="primary" :loading="zipping" @click="downloadZip">
          批量下载 ZIP（{{ zipEntryCount }} 个文件）
        </el-button>
        <el-select v-model="saveFolder" style="width: 100px">
          <el-option label="文件夹 a" value="a" />
          <el-option label="文件夹 b" value="b" />
          <el-option label="文件夹 c" value="c" />
        </el-select>
        <el-button :loading="saving" @click="saveToMaterials">保存到素材库</el-button>
        <el-button type="success" @click="goPublish">去一键发布</el-button>
      </div>

      <div class="image-grid">
        <div
          v-for="img in generatedImages"
          :key="img.id"
          class="image-card"
          :class="{ selected: isAnchorSelected(img), 'is-anchor': img.role === 'a', 'is-b': img.role === 'b', 'is-c': img.role === 'c' }"
          @click="onCardClick(img, $event)"
        >
          <div class="select-overlay">
            <el-checkbox
              :model-value="isAnchorSelected(img)"
              :disabled="!!(img.role && img.role !== 'a')"
              @click.stop
              @change="() => toggleAnchor(img)"
            />
            <div class="overlay-tags">
              <el-tag v-if="img.role === 'a'" type="danger" size="small" effect="dark">A</el-tag>
              <el-tag v-else-if="img.role === 'b'" type="warning" size="small" effect="dark">B</el-tag>
              <el-tag v-else-if="img.role === 'c'" type="success" size="small" effect="dark">C</el-tag>
              <el-button
                class="preview-btn"
                circle
                size="small"
                title="预览大图"
                @click.stop="openPreview(img.dataUrl)"
              >
                <el-icon><ZoomIn /></el-icon>
              </el-button>
              <el-button
                class="preview-btn"
                circle
                size="small"
                title="下载单张"
                @click.stop="downloadSingleImage(img)"
              >
                <el-icon><Download /></el-icon>
              </el-button>
            </div>
          </div>
          <img :src="img.dataUrl" alt="" class="image-thumb" loading="lazy" draggable="false" />
          <div class="image-meta">
            <span>{{ img.role ? `${img.role.toUpperCase()} · ` : '' }}第 {{ img.id }} 张</span>
            <span v-if="img.setIndex">套装 #{{ img.setIndex }}</span>
          </div>
          <p v-if="img.genTags" class="image-gen-tags">{{ img.genTags }}</p>
        </div>
      </div>
    </div>

    <el-image-viewer
      v-if="previewVisible"
      :url-list="[previewUrl]"
      teleported
      @close="previewVisible = false"
    />

    <div v-else-if="!loading" class="card-section empty-state">
      <div class="empty-visual">
        <img :src="PLACEHOLDERS.emptyGallery" alt="等待生成" />
      </div>
      <p class="empty-title">生成结果将显示在这里</p>
      <p class="empty-hint">先批量生成图片，再勾选一张或多张作为锚点 A，批量生成 B 五宫格 + C 产品信息图</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { Loading, Setting, Refresh, ZoomIn, Download, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import JSZip from 'jszip';
import { imageGenApi, settingsApi, aiApi } from '@/api';
import PageHero from '@/components/PageHero.vue';
import WorkflowGuide from '@/components/WorkflowGuide.vue';
import { PLACEHOLDERS, BATCH_IMAGE_WORKFLOW } from '@/constants/placeholders';
import { PRODUCT_CATEGORIES, getCategoryById, resolveProductCategory, applyCategoryDefaults, syncCategoryFromProductInfo, SEED_PAPER_COMPOSITION, UNIFIED_SEED_PAPER_INFO } from '@/constants/productCategories';
import {
  COLOR_OPTIONS,
  REGULAR_SHAPES,
  IRREGULAR_SHAPES,
  STYLE_OPTIONS,
  TEXT_COLOR_OPTIONS,
  FONT_OPTIONS,
  resolveGenModifiers,
  buildFullPrompt,
  formatGenTags,
} from '@/constants/genOptions';
import { B_GRID_OPTIONS, B_GRID_MODES, getGridLayout, bGridLabel, resolveBGridCount } from '@/constants/bGridLayouts';
import { useBatchImageGenStore } from '@/stores/batchImageGen';
import {
  loadCategoryHistory,
  loadDimensionsHistory,
  rememberAbcFormInputs,
} from '@/utils/abcFormHistory';
import { urlToDataUrl } from '@/utils/imageDataUrl';
import { assetUrl } from '@/utils/assetUrl';
import { compressDataUrl } from '@/utils/compressDataUrl';

const router = useRouter();
const route = useRoute();
const genStore = useBatchImageGenStore();

const {
  form,
  genOptions,
  abcForm,
  generatedImages,
  abcSets,
  selectedAnchorId,
  selectedAnchorIds,
  materialAnchor,
  lastBatchId,
  statusMessage,
  saveFolder,
} = storeToRefs(genStore);

const loading = ref(false);
const generatingAbc = ref(false);
/** 递增即取消当前进行中的批量/ABC 生成 */
const genSessionId = ref(0);
const abcBatchProgress = ref('');
const zipping = ref(false);
const saving = ref(false);
const savingSetId = ref(null);
const copyingSetId = ref(null);
const apiConfigured = ref(false);
const imageGenSettings = ref(null);
const hasRestoredWork = ref(false);
const maxCount = ref(200);
const submitChunk = ref(40);
const pollHint = ref({
  maxAttempts: 80,
  intervalMs: 1800,
  fastAttempts: 24,
  fastIntervalMs: 900,
  pollConcurrency: 22,
  submitParallel: 6,
  abcSetConcurrency: 3,
});
const apiConfigExpanded = ref(false);
const previewVisible = ref(false);
const previewUrl = ref('');
const categoryHistory = ref(loadCategoryHistory());
const dimensionsHistory = ref(loadDimensionsHistory());

const currentCategoryDefaultDimensions = computed(() => {
  const cat = getCategoryById(abcForm.value.categoryKey);
  return cat?.defaultDimensions || '';
});

const previewGridCount = computed(() => {
  const f = abcForm.value;
  if (f.bGridMode === B_GRID_MODES.random) return 5;
  if (f.bGridMode === B_GRID_MODES.custom) return f.bGridCustomCount || 5;
  return f.bGridCount;
});

const currentGridLayout = computed(() =>
  getGridLayout(previewGridCount.value, abcForm.value.bGridCustomLayout)
);

const bGridPreviewHint = computed(() => {
  const f = abcForm.value;
  if (f.bGridMode === B_GRID_MODES.random) {
    return '当前：随机模式，每套在 2～5 宫格中自动抽取';
  }
  if (f.bGridMode === B_GRID_MODES.custom) {
    const layout = getGridLayout(f.bGridCustomCount, f.bGridCustomLayout);
    return `当前：自定义 ${layout.label}（${layout.layoutDesc}）`;
  }
  const layout = getGridLayout(f.bGridCount);
  return `当前：${layout.label}（${layout.layoutDesc}）`;
});

const groupedAbcSets = computed(() => {
  const sorted = [...abcSets.value].sort(
    (a, b) => Number(a.setIndex) - Number(b.setIndex) || String(a.productCategory).localeCompare(String(b.productCategory))
  );
  const groups = new Map();
  for (const set of sorted) {
    const key = set.productCategory || resolveProductCategory(abcForm.value) || '未分类';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(set);
  }
  return [...groups.entries()].map(([category, sets]) => ({ category, sets }));
});

const currentShapeOptions = computed(() => {
  const randomOpt = { id: 'random', label: '随机抽卡' };
  if (genOptions.value.shapeCategory === 'irregular') {
    return [...IRREGULAR_SHAPES, randomOpt];
  }
  return [...REGULAR_SHAPES, randomOpt];
});

function onShapeCategoryChange(category) {
  genOptions.value.shapeCategory = category;
  const ids = currentShapeOptions.value.map((s) => s.id);
  if (!ids.includes(genOptions.value.shapeKey)) {
    genOptions.value.shapeKey = ids[0];
  }
}

function buildPromptsForChunk(basePrompt, startId, count) {
  return Array.from({ length: count }, (_, i) => {
    const slotIndex = startId + i - 1;
    const mods = resolveGenModifiers(genOptions.value, slotIndex, Date.now());
    return buildFullPrompt(basePrompt, mods);
  });
}

function modifiersForTask(task) {
  const slotIndex = (task?.id ?? 1) - 1;
  return resolveGenModifiers(genOptions.value, slotIndex, task?.seed ?? 0);
}

const productInfoPlaceholder = computed(() => UNIFIED_SEED_PAPER_INFO.replace(/\n/g, '；'));

function selectCategory(key) {
  abcForm.value.categoryKey = key;
  abcForm.value.productInfo = UNIFIED_SEED_PAPER_INFO;
  if (key === 'custom') {
    abcForm.value.dimensionsMode = 'custom';
    if (!abcForm.value.productDimensions && dimensionsHistory.value[0]) {
      abcForm.value.productDimensions = dimensionsHistory.value[0];
    }
    return;
  }
  applyCategoryDefaults(abcForm.value, key, { fillInfo: false });
}

function selectBGridPreset(count) {
  abcForm.value.bGridMode = B_GRID_MODES.preset;
  abcForm.value.bGridCount = count;
}

function selectBGridRandom() {
  abcForm.value.bGridMode = B_GRID_MODES.random;
}

function selectBGridCustom() {
  abcForm.value.bGridMode = B_GRID_MODES.custom;
  if (!abcForm.value.bGridCustomCount) {
    abcForm.value.bGridCustomCount = abcForm.value.bGridCount || 5;
  }
}

function onProductInfoBlur() {
  syncCategoryFromProductInfo(abcForm.value);
}

function selectDimensionsPreset() {
  abcForm.value.dimensionsMode = 'preset';
  const cat = getCategoryById(abcForm.value.categoryKey);
  if (cat?.defaultDimensions) {
    abcForm.value.productDimensions = cat.defaultDimensions;
  }
}

function selectDimensionsCustom() {
  abcForm.value.dimensionsMode = 'custom';
  if (!abcForm.value.productDimensions && dimensionsHistory.value[0]) {
    abcForm.value.productDimensions = dimensionsHistory.value[0];
  }
}

function onCategoryCustomPick() {
  abcForm.value.dimensionsMode = 'custom';
  persistAbcHistory();
}

function onDimensionsPick() {
  abcForm.value.dimensionsMode = 'custom';
  persistAbcHistory();
}

function persistAbcHistory() {
  const saved = rememberAbcFormInputs(abcForm.value);
  categoryHistory.value = saved.categories;
  dimensionsHistory.value = saved.dimensions;
}

function validateAbcForm() {
  syncCategoryFromProductInfo(abcForm.value);
  const category = resolveProductCategory(abcForm.value);
  if (!category) {
    ElMessage.warning('请选择产品分类，或填写自定义分类');
    return false;
  }
  if (!abcForm.value.productDimensions.trim()) {
    ElMessage.warning('请填写产品尺寸（将显示在 C 图）');
    return false;
  }
  if (!abcForm.value.productInfo.trim()) {
    ElMessage.warning('请填写产品信息');
    return false;
  }
  return true;
}

const progress = reactive({ done: 0, total: 0, failed: 0 });

const POLL_CONCURRENCY = computed(() => pollHint.value.pollConcurrency || 22);
const SUBMIT_PARALLEL = computed(() => pollHint.value.submitParallel || 6);
const ABC_SET_CONCURRENCY = computed(() => pollHint.value.abcSetConcurrency || 3);

/** 批量生成的锚点候选图（未标记 B/C 角色） */
const anchorCandidateImages = computed(() =>
  generatedImages.value.filter((img) => !img.role)
);

const anchorCandidateCount = computed(() => {
  let n = anchorCandidateImages.value.length;
  if (materialAnchor.value?.dataUrl && selectedAnchorId.value === 'material') {
    n += 1;
  }
  return n;
});

const hasDownloadableImages = computed(
  () =>
    generatedImages.value.length > 0 ||
    materialAnchor.value?.dataUrl ||
    abcSets.value.length > 0
);

const zipEntryCount = computed(() => collectDownloadEntries().length);

const anchorImage = computed(() => {
  if (selectedAnchorId.value === 'material' && materialAnchor.value) {
    return materialAnchor.value;
  }
  return generatedImages.value.find((img) => img.id === selectedAnchorId.value) || null;
});

const batchAnchorList = computed(() => {
  if (selectedAnchorId.value === 'material' && materialAnchor.value) {
    return [materialAnchor.value];
  }
  const ids =
    selectedAnchorIds.value.length > 0
      ? selectedAnchorIds.value
      : selectedAnchorId.value
        ? [selectedAnchorId.value]
        : [];
  return ids
    .map((id) => generatedImages.value.find((img) => img.id === id && (!img.role || img.role === 'a')))
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);
});

function isCancelled(sessionId) {
  return sessionId !== genSessionId.value;
}

function cancelGeneration() {
  genSessionId.value += 1;
  loading.value = false;
  generatingAbc.value = false;
  abcBatchProgress.value = '';
  statusMessage.value = '已取消生成';
  ElMessage.info('已取消生成');
}
const progressPercent = computed(() =>
  progress.total ? Math.round((progress.done / progress.total) * 100) : 0
);
const progressText = computed(() => {
  const base = `${progress.done}/${progress.total}`;
  return progress.failed ? `${base}（失败 ${progress.failed}）` : base;
});

const workflowActiveStep = computed(() => {
  if (abcSets.value.some((s) => s.b && s.c)) return 4;
  if (batchAnchorList.value.length && resolveProductCategory(abcForm.value) &&
    (abcForm.value.productDimensions || abcForm.value.productInfo)) {
    return generatingAbc.value ? 3 : 2;
  }
  if (generatedImages.value.length) return 2;
  return 1;
});

function openPreview(url) {
  if (!url) return;
  previewUrl.value = url;
  previewVisible.value = true;
}

function onCardClick(img, event) {
  if (event.target.closest('.preview-btn, .el-checkbox')) return;
  if (img.role && img.role !== 'a') return;
  toggleAnchor(img);
}

async function refreshApiStatus() {
  try {
    const data = await imageGenApi.health();
    if (data.maxCount) maxCount.value = data.maxCount;
    if (data.submitChunk) submitChunk.value = data.submitChunk;
    if (data.pollHint) pollHint.value = { ...pollHint.value, ...data.pollHint };
    apiConfigured.value = data.apiConfigured === true;
    if (!apiConfigured.value) apiConfigExpanded.value = true;
  } catch (err) {
    apiConfigured.value = false;
    apiConfigExpanded.value = true;
    const msg = err?.response?.data?.message || err?.message || '';
    if (/未登录|Token|401/i.test(msg)) {
      ElMessage.warning('登录已过期，请重新登录后再生图');
    }
  }
  try {
    const res = await settingsApi.get();
    imageGenSettings.value = res.data?.imageGen || null;
  } catch {
    imageGenSettings.value = null;
  }
}

async function loadMaterialAnchorFromRoute() {
  const q = route.query;
  if (q.from !== 'materials' || !q.path) return;

  try {
    const url = assetUrl(q.url ? String(q.url) : `/materials/${q.path}`);
    const dataUrl = await urlToDataUrl(url);
    const anchor = {
      id: 'material',
      dataUrl,
      url,
      path: String(q.path),
      filename: String(q.filename || ''),
      index: String(q.index || ''),
      prompt: form.value.prompt?.trim() || `素材库 A 图 ${q.filename || q.path}`,
      source: 'material',
      role: 'a',
    };
    genStore.setMaterialAnchor(anchor);
    statusMessage.value = `已加载素材 A：${anchor.filename || anchor.path}`;
    ElMessage.success('已加载素材 A 图，请填写产品信息后生成 B + C');
    await nextTick();
    document.querySelector('.abc-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    ElMessage.error(err.message || '加载素材图片失败');
  }

  router.replace({ path: '/batch-image' });
}

onMounted(async () => {
  categoryHistory.value = loadCategoryHistory();
  dimensionsHistory.value = loadDimensionsHistory();
  if (!abcForm.value.categoryKey) {
    abcForm.value.categoryKey = 'clothing-tag';
  }
  if (!abcForm.value.bGridMode) {
    abcForm.value.bGridMode = 'preset';
  }
  if (!abcForm.value.productInfo?.trim()) {
    abcForm.value.productInfo = UNIFIED_SEED_PAPER_INFO;
  }
  if (abcForm.value.categoryKey !== 'custom') {
    applyCategoryDefaults(abcForm.value, abcForm.value.categoryKey, { fillInfo: false });
  }
  if (!abcForm.value.dimensionsMode) {
    abcForm.value.dimensionsMode = abcForm.value.categoryKey === 'custom' ? 'custom' : 'preset';
  }
  syncCategoryFromProductInfo(abcForm.value);
  if (generatedImages.value.length || materialAnchor.value || abcSets.value.length) {
    hasRestoredWork.value = true;
  }
  await refreshApiStatus();
  await loadMaterialAnchorFromRoute();
});

function isAnchorSelected(img) {
  if (img.role && img.role !== 'a') return false;
  return (
    selectedAnchorIds.value.includes(img.id) ||
    selectedAnchorId.value === img.id
  );
}

function toggleAnchor(img) {
  if (img.role && img.role !== 'a') return;
  materialAnchor.value = null;
  const ids = [...selectedAnchorIds.value];
  const idx = ids.indexOf(img.id);
  if (idx >= 0) {
    ids.splice(idx, 1);
    selectedAnchorIds.value = ids;
    selectedAnchorId.value =
      selectedAnchorId.value === img.id ? ids[0] ?? null : selectedAnchorId.value;
  } else {
    selectedAnchorIds.value = [...ids, img.id].sort((a, b) => a - b);
    selectedAnchorId.value = img.id;
  }
}

function selectAllAnchorCandidates() {
  const ids = anchorCandidateImages.value.map((i) => i.id);
  selectedAnchorIds.value = ids;
  selectedAnchorId.value = ids[0] ?? null;
  materialAnchor.value = null;
}

function clearAnchorSelection() {
  selectedAnchorIds.value = [];
  selectedAnchorId.value = null;
}

function allocateSetIndices(anchors) {
  const used = new Set(
    [
      ...abcSets.value.map((s) => String(s.setIndex)),
      ...generatedImages.value.filter((i) => i.setIndex).map((i) => String(i.setIndex)),
    ].filter(Boolean)
  );
  return anchors.map((anchor) => {
    if (anchor.index && /^\d+$/.test(String(anchor.index))) {
      const idx = String(anchor.index);
      if (!used.has(idx)) {
        used.add(idx);
        return { anchor, setIndex: idx };
      }
    }
    let n = 1;
    while (used.has(String(n))) n += 1;
    const setIndex = String(n);
    used.add(setIndex);
    return { anchor, setIndex };
  });
}

function categoryFolderName(name) {
  return String(name || '未分类').replace(/[/\\:*?"<>|]/g, '_').slice(0, 40);
}

function resetAll() {
  genStore.resetAll();
  progress.done = 0;
  progress.total = 0;
  progress.failed = 0;
  hasRestoredWork.value = false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pollDelay(attempt) {
  const { fastAttempts, fastIntervalMs, intervalMs } = pollHint.value;
  if (attempt < fastAttempts) return fastIntervalMs;
  const extra = attempt - fastAttempts;
  return Math.min(intervalMs + extra * 150, 3500);
}

async function resolveCompletedImage(data, task, pollBatchId) {
  const img = data.image;
  if (!img) throw new Error('无图片数据');
  if (img.dataUrl) return img;
  if (img.imageUrl) {
    try {
      const dataUrl = await urlToDataUrl(img.imageUrl);
      return { ...img, dataUrl };
    } catch {
      const retry = await imageGenApi.poll({
        ...task,
        batchId: pollBatchId,
        role: task.role,
        lazyImage: false,
      });
      if (retry.status === 'completed' && retry.image?.dataUrl) return retry.image;
      throw new Error('图片下载失败');
    }
  }
  return img;
}

async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return results;
}

async function submitChunkRequest(prompt, size, startId, n, batchId, prompts) {
  const data = await imageGenApi.generate({
    prompt,
    prompts,
    count: n,
    size,
    startId,
    batchId,
  });
  if (!data.success && data.message) throw new Error(data.message);
  return data;
}

async function submitAll(prompt, total, size) {
  const chunks = [];
  for (let startId = 1; startId <= total; startId += submitChunk.value) {
    chunks.push({ startId, n: Math.min(submitChunk.value, total - startId + 1) });
  }

  let batchId = null;
  const tasks = [];
  const [first, ...rest] = chunks;

  if (first) {
    const firstPrompts = buildPromptsForChunk(prompt, first.startId, first.n);
    const firstData = await submitChunkRequest(
      prompt,
      size,
      first.startId,
      first.n,
      null,
      firstPrompts
    );
    batchId = firstData.batchId;
    tasks.push(...(firstData.tasks || []));
    statusMessage.value = `正在提交任务（${tasks.length}/${total}）...`;
  }

  if (rest.length) {
    const restLists = await runPool(rest, SUBMIT_PARALLEL.value, async ({ startId, n }) => {
      const chunkPrompts = buildPromptsForChunk(prompt, startId, n);
      const data = await submitChunkRequest(prompt, size, startId, n, batchId, chunkPrompts);
      return data.tasks || [];
    });
    tasks.push(...restLists.flat());
    statusMessage.value = `正在提交任务（${tasks.length}/${total}）...`;
  }

  return { batchId, tasks };
}

async function pollOneTask(task, batchId, sessionId = null) {
  const pollBatchId = task.batchId || batchId;
  for (let i = 0; i < pollHint.value.maxAttempts; i++) {
    if (sessionId != null && isCancelled(sessionId)) {
      throw new Error('CANCELLED');
    }
    const data = await imageGenApi.poll({
      ...task,
      batchId: pollBatchId,
      role: task.role,
      lazyImage: true,
    });
    if (data.status === 'completed') {
      const image = await resolveCompletedImage(data, task, pollBatchId);
      return { ...image, role: task.role, setIndex: task.setIndex, label: task.label };
    }
    if (data.status === 'failed') throw new Error(data.message || '任务失败');
    await sleep(pollDelay(i));
  }
  throw new Error(`任务 ${task.taskId} 超时`);
}

function extFromMime(mime) {
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'png';
}

function parseDataUrl(dataUrl) {
  const [meta, base64] = dataUrl.split(',');
  if (!base64) return null;
  return { base64, mime: (meta.match(/data:([^;]+)/) || [])[1] || 'image/png' };
}

function zipFileName(count, batchId) {
  return `AI批量_${count}张_含锚点_${batchId || 'batch'}.zip`;
}

/** 收集 ZIP 内所有文件（锚点候选 + 素材锚点 + ABC 套装分目录） */
function collectDownloadEntries() {
  const entries = [];
  const seen = new Set();

  function add(path, dataUrl) {
    if (!dataUrl || seen.has(dataUrl)) return;
    seen.add(dataUrl);
    entries.push({ path, dataUrl });
  }

  const sortedAnchors = [...anchorCandidateImages.value].sort((a, b) => a.id - b.id);
  const padLen = Math.max(3, String(sortedAnchors.length || 1).length);
  sortedAnchors.forEach((img, idx) => {
    const parsed = parseDataUrl(img.dataUrl);
    const ext = parsed ? extFromMime(parsed.mime) : 'png';
    add(`anchors/anchor_${String(idx + 1).padStart(padLen, '0')}_id${img.id}.${ext}`, img.dataUrl);
  });

  if (materialAnchor.value?.dataUrl) {
    const ma = materialAnchor.value;
    const parsed = parseDataUrl(ma.dataUrl);
    const ext = parsed ? extFromMime(parsed.mime) : 'png';
    const label = (ma.filename || ma.path || 'material').replace(/[/\\]/g, '_');
    add(`anchors/material_${label}.${ext}`, ma.dataUrl);
  }

  for (const set of abcSets.value) {
    const catFolder = categoryFolderName(set.productCategory);
    const prefix = `abc_sets/${catFolder}/set_${set.setIndex}`;
    const gridTag = set.bGridCount ? `_b${set.bGridCount}` : '';
    if (set.anchor?.dataUrl) add(`${prefix}/a_anchor.png`, set.anchor.dataUrl);
    if (set.b?.dataUrl) add(`${prefix}/b_grid${gridTag}.png`, set.b.dataUrl);
    if (set.c?.dataUrl) add(`${prefix}/c_product.png`, set.c.dataUrl);
  }

  generatedImages.value
    .filter((img) => img.role === 'b' || img.role === 'c')
    .forEach((img) => {
      const parsed = parseDataUrl(img.dataUrl);
      const ext = parsed ? extFromMime(parsed.mime) : 'png';
      const setPart = img.setIndex ? `set_${img.setIndex}_` : '';
      add(`generated/${setPart}${img.role}_${img.id}.${ext}`, img.dataUrl);
    });

  return entries;
}

async function buildZipFromEntries(entries) {
  const zip = new JSZip();
  for (const { path, dataUrl } of entries) {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) throw new Error(`图片数据无效：${path}`);
    zip.file(path, parsed.base64, { base64: true });
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function singleImageFileName(img) {
  const parsed = parseDataUrl(img?.dataUrl);
  const ext = parsed ? extFromMime(parsed.mime) : 'png';
  const parts = ['AI'];
  if (img?.role) parts.push(String(img.role).toUpperCase());
  if (img?.setIndex) parts.push(`set${img.setIndex}`);
  if (img?.source === 'material' || img?.filename || img?.path) {
    const label = (img.filename || img.path || 'material').replace(/[/\\]/g, '_').replace(/\.[^.]+$/, '');
    parts.push(label);
  } else {
    parts.push(String(img?.id ?? 'img'));
  }
  return `${parts.join('_')}.${ext}`;
}

function downloadSingleImage(img) {
  const parsed = parseDataUrl(img?.dataUrl);
  if (!parsed) {
    ElMessage.error('图片数据无效');
    return;
  }
  const bytes = Uint8Array.from(atob(parsed.base64), (c) => c.charCodeAt(0));
  downloadBlob(new Blob([bytes], { type: parsed.mime }), singleImageFileName(img));
}

async function downloadZip() {
  const entries = collectDownloadEntries();
  if (!entries.length) {
    ElMessage.warning('没有可下载的图片');
    return;
  }
  zipping.value = true;
  const anchorN = entries.filter((e) => e.path.startsWith('anchors/')).length;
  statusMessage.value = `正在打包（锚点 ${anchorN} 张，共 ${entries.length} 个文件）...`;
  try {
    const blob = await buildZipFromEntries(entries);
    downloadBlob(blob, zipFileName(entries.length, lastBatchId.value));
    ElMessage.success(`ZIP 已开始下载（含锚点图 ${anchorN} 张）`);
  } catch (err) {
    ElMessage.error(err.message || '打包失败');
  } finally {
    zipping.value = false;
  }
}

async function handleSubmit() {
  if (!form.value.prompt.trim()) {
    ElMessage.warning('请输入图片描述');
    return;
  }

  const sessionId = ++genSessionId.value;
  loading.value = true;
  selectedAnchorId.value = null;
  selectedAnchorIds.value = [];
  materialAnchor.value = null;
  abcSets.value = [];
  statusMessage.value = '正在提交任务...';

  const total = Math.min(maxCount.value, Math.max(1, form.value.count));
  const promptUsed = form.value.prompt.trim();

  try {
    const { batchId, tasks } = await submitAll(promptUsed, total, form.value.size);
    if (!tasks.length) throw new Error('未获取到任务');

    lastBatchId.value = batchId;
    progress.total = total;
    progress.done = 0;
    progress.failed = 0;
    generatedImages.value = [];
    statusMessage.value = `已提交 ${tasks.length} 个任务，正在出图...`;

    const batchImages = [];
    await runPool(tasks, POLL_CONCURRENCY.value, async (task) => {
      if (isCancelled(sessionId)) return;
      try {
        const image = await pollOneTask(task, batchId, sessionId);
        if (isCancelled(sessionId)) return;
        const mods = modifiersForTask(task);
        batchImages.push({
          ...image,
          prompt: task.prompt || promptUsed,
          genTags: formatGenTags(mods),
          genModifiers: mods,
        });
        generatedImages.value = [...batchImages].sort((a, b) => a.id - b.id);
      } catch (err) {
        if (err.message === 'CANCELLED') return;
        progress.failed += 1;
      } finally {
        progress.done += 1;
        statusMessage.value = `正在出图（${progress.done}/${total}）${progress.failed ? `，失败 ${progress.failed}` : ''}...`;
      }
    });

    if (isCancelled(sessionId)) return;

    generatedImages.value = batchImages.sort((a, b) => a.id - b.id);

    if (!batchImages.length) {
      statusMessage.value = '全部任务失败，未生成图片';
      ElMessage.error('全部任务失败');
    } else {
      if (batchImages.length === total) {
        statusMessage.value = `已完成 ${total} 张，请勾选一张或多张作为锚点 A`;
        ElMessage.success(`成功生成 ${total} 张，请勾选锚点`);
      } else {
        statusMessage.value = `成功 ${batchImages.length}/${total} 张`;
        ElMessage.warning(`部分成功：${batchImages.length}/${total} 张`);
      }
    }
  } catch (err) {
    statusMessage.value = err.message || '请求失败';
    ElMessage.error(err.message || '生成失败');
  } finally {
    loading.value = false;
  }
}

async function generateAbcForAnchor(anchor, setIndex, sessionId) {
  const productCategory = resolveProductCategory(abcForm.value);
  const resolvedGridCount = resolveBGridCount(abcForm.value, setIndex, anchor.seed);
  const mods = resolveGenModifiers(genOptions.value, Number(setIndex) || 0, anchor.seed || 0);
  const setEntry = reactive({
    setIndex,
    productCategory,
    categoryKey: abcForm.value.categoryKey,
    bGridMode: abcForm.value.bGridMode,
    bGridCount: resolvedGridCount,
    enablePlantingMethod: abcForm.value.enablePlantingMethod,
    genTags: formatGenTags(mods),
    anchor: { ...anchor, role: 'a' },
    b: null,
    c: null,
  });
  abcSets.value.unshift(setEntry);

  anchor.role = 'a';
  anchor.setIndex = setIndex;

  const gridLabel = getGridLayout(resolvedGridCount, abcForm.value.bGridCustomLayout).label;
  statusMessage.value = `套装 #${setIndex}（${productCategory}）：正在提交 B（${gridLabel}）+ C...`;

  const res = await imageGenApi.generateAbcSet({
    anchorPrompt: buildFullPrompt(anchor.prompt || form.value.prompt, mods),
    anchorDataUrl: anchor.dataUrl,
    productCategory,
    productDimensions: abcForm.value.productDimensions,
    productInfo: abcForm.value.productInfo,
    bGridMode: abcForm.value.bGridMode,
    bGridCount: abcForm.value.bGridCount,
    bGridCustomCount: abcForm.value.bGridCustomCount,
    bGridCustomLayout: abcForm.value.bGridCustomLayout,
    enablePlantingMethod: abcForm.value.enablePlantingMethod,
    plantingMethod: abcForm.value.plantingMethod,
    stylePrompt: mods.stylePrompt,
    textColorKey: genOptions.value.textColorKey,
    fontKey: genOptions.value.fontKey,
    size: form.value.size,
    cSize: abcForm.value.cSize,
    setIndex,
    seed: anchor.seed,
  });

  if (isCancelled(sessionId)) return setEntry;
  if (!res.success) throw new Error(res.message || '提交失败');

  const tasks = res.tasks || [];
  statusMessage.value = `套装 #${setIndex}：正在并行生成 B + C...`;

  await runPool(tasks, tasks.length, async (task) => {
    if (isCancelled(sessionId)) return;
    try {
      const image = await pollOneTask({ ...task, batchId: res.batchId }, res.batchId, sessionId);
      if (task.role === 'b') setEntry.b = { ...image, genTags: formatGenTags(mods) };
      else if (task.role === 'c') setEntry.c = { ...image, genTags: formatGenTags(mods) };
      generatedImages.value.push(image);
    } catch (err) {
      if (err.message === 'CANCELLED') return;
      ElMessage.error(`套装 #${setIndex} ${task.label || task.role} 失败：${err.message}`);
    }
  });

  if (!isCancelled(sessionId) && setEntry.b && setEntry.c) {
    await generateViralCopyForSet(setEntry, { silent: true });
  }

  return setEntry;
}

async function handleGenerateAbc() {
  const anchors = batchAnchorList.value;
  if (!anchors.length) {
    ElMessage.warning('请先勾选一张或多张图片作为锚点 A');
    return;
  }
  if (!validateAbcForm()) return;
  persistAbcHistory();

  const sessionId = ++genSessionId.value;
  generatingAbc.value = true;
  const anchorJobs = allocateSetIndices(anchors);

  try {
    const results = await runPool(anchorJobs, ABC_SET_CONCURRENCY.value, async ({ anchor, setIndex }, i) => {
      if (isCancelled(sessionId)) return null;
      abcBatchProgress.value = `${i + 1}/${anchorJobs.length}`;
      statusMessage.value =
        anchorJobs.length > 1
          ? `批量 B+C：第 ${i + 1}/${anchorJobs.length} 套（锚点第 ${anchor.id} 张）...`
          : '正在生成 B + C...';

      try {
        return await generateAbcForAnchor(anchor, setIndex, sessionId);
      } catch (err) {
        if (err.message === 'CANCELLED' || isCancelled(sessionId)) return null;
        ElMessage.error(`锚点第 ${anchor.id} 张：${err.message || '生成失败'}`);
        return null;
      }
    });

    if (isCancelled(sessionId)) {
      statusMessage.value = '已取消生成';
      return;
    }

    const okCount = results.filter((r) => r?.b && r?.c).length;

    if (anchors.length === 1) {
      const last = abcSets.value[0];
      if (last?.b && last?.c) {
        statusMessage.value = last.viralCopy?.title
          ? `套装 #${last.setIndex} 全套完成（含种草文案）`
          : `套装 #${last.setIndex} 图片已完成，文案生成中或失败请点 A 图重试`;
        ElMessage.success(
          last.viralCopy?.title
            ? `${bGridLabel(last.bGridCount || abcForm.value.bGridCount, last.enablePlantingMethod, last.bGridMode)} + C + 种草文案已完成`
            : `${bGridLabel(last.bGridCount || abcForm.value.bGridCount, last.enablePlantingMethod, last.bGridMode)} + C 已完成`
        );
      } else {
        ElMessage.warning('部分生成失败，请重试');
      }
    } else if (okCount === anchors.length) {
      statusMessage.value = `批量完成：${okCount}/${anchors.length} 套`;
      ElMessage.success(`已生成 ${okCount} 套 B+C`);
    } else {
      statusMessage.value = `批量完成：成功 ${okCount}/${anchors.length} 套`;
      ElMessage.warning(`部分成功：${okCount}/${anchors.length} 套`);
    }
  } finally {
    generatingAbc.value = false;
    abcBatchProgress.value = '';
  }
}

function copyText(text) {
  if (!text) return;
  navigator.clipboard.writeText(text);
  ElMessage.success('已复制');
}

async function generateViralCopyForSet(set, opts = {}) {
  const { silent = false } = opts;
  if (!set.anchor?.dataUrl || !set.b?.dataUrl || !set.c?.dataUrl) {
    if (!silent) ElMessage.warning('请等待套装 ABC 全部生成完成');
    return;
  }
  if (copyingSetId.value === set.setIndex) return;
  copyingSetId.value = set.setIndex;
  statusMessage.value = `套装 #${set.setIndex}：DeepSeek 正在分析配图并生成种草文案...`;
  try {
    const [aUrl, bUrl, cUrl] = await Promise.all([
      compressDataUrl(set.anchor.dataUrl),
      compressDataUrl(set.b.dataUrl),
      compressDataUrl(set.c.dataUrl),
    ]);
    const styleOpt = STYLE_OPTIONS.find((s) => s.id === genOptions.value.styleKey);

    const res = await aiApi.generateAbcCopy({
      setIndex: set.setIndex,
      productCategory: set.productCategory || resolveProductCategory(abcForm.value),
      productInfo: abcForm.value.productInfo,
      productDimensions: abcForm.value.productDimensions,
      genTags: set.genTags || formatGenTags(resolveGenModifiers(genOptions.value, Number(set.setIndex) || 0, 0)),
      designPrompt: set.anchor.prompt || form.value.prompt,
      styleKey: styleOpt?.label || '口语化种草风',
      imageDataUrls: [aUrl, bUrl, cUrl],
    });

    set.viralCopy = {
      title: res.data?.title || '',
      content: res.data?.content || '',
      tags: Array.isArray(res.data?.tags) ? [...res.data.tags] : [],
      mock: !!res.meta?.mock,
    };

    if (res.meta?.mock) {
      if (!silent) ElMessage.warning(res.message || '已使用模板文案');
    } else if (!silent) {
      ElMessage.success('DeepSeek 种草文案已生成（标题+正文+标签，表情包已加强）');
    }
    statusMessage.value = `套装 #${set.setIndex} 种草文案已就绪`;
  } catch {
    // interceptor
  } finally {
    copyingSetId.value = null;
  }
}

/** 点击套装 A 图：一键生成/刷新 DeepSeek 种草文案 */
function onSetAnchorClick(set) {
  if (!set.anchor || !set.b || !set.c) {
    ElMessage.info('请等待 B、C 图生成完成');
    return;
  }
  generateViralCopyForSet(set);
}

function goPublishWithCopy(set) {
  if (!set.viralCopy?.title) {
    ElMessage.warning('请先生成种草文案');
    return;
  }
  sessionStorage.setItem(
    'xhs-publish-draft',
    JSON.stringify({
      title: set.viralCopy.title,
      content: set.viralCopy.content,
      tags: set.viralCopy.tags,
      setIndex: set.setIndex,
    })
  );
  router.push('/publish');
}

async function saveAbcSet(set) {
  if (!set.anchor || !set.b || !set.c) {
    ElMessage.warning('套装未完整，请等待 B/C 生成完成');
    return;
  }
  savingSetId.value = set.setIndex;
  const setIndex = set.setIndex;
  const slots = [
    { img: set.anchor, folder: 'a' },
    { img: set.b, folder: 'b' },
    { img: set.c, folder: 'c' },
  ];
  try {
    for (let i = 0; i < slots.length; i++) {
      const { img, folder } = slots[i];
      statusMessage.value = `正在保存 ${folder.toUpperCase()}（${i + 1}/3）...`;
      const dataUrl = await compressDataUrl(img.dataUrl);
      await imageGenApi.saveOneToMaterials({
        dataUrl,
        folder,
        index: setIndex,
      });
    }
    ElMessage.success(`ABC 套装已保存为 a${setIndex} / b${setIndex} / c${setIndex}`);
    statusMessage.value = `套装 #${setIndex} 已写入素材库`;
  } catch {
    // handled by interceptor
  } finally {
    savingSetId.value = null;
  }
}

async function saveToMaterials() {
  if (!generatedImages.value.length) return;
  saving.value = true;
  const list = generatedImages.value;
  let ok = 0;
  try {
    for (let i = 0; i < list.length; i++) {
      const img = list[i];
      statusMessage.value = `正在保存到素材库（${i + 1}/${list.length}）...`;
      const dataUrl = await compressDataUrl(img.dataUrl);
      await imageGenApi.saveOneToMaterials({
        dataUrl,
        folder: img.role || saveFolder.value,
        index: img.setIndex || img.id,
      });
      ok += 1;
    }
    ElMessage.success(`已保存 ${ok} 张到素材库`);
    statusMessage.value = `已保存 ${ok} 张到素材库`;
  } catch {
    if (ok > 0) {
      ElMessage.warning(`部分成功：已保存 ${ok}/${list.length} 张`);
    }
  } finally {
    saving.value = false;
  }
}

function goPublish() {
  router.push('/publish');
  ElMessage.info('请在「从素材库选择」中选用刚保存的图片');
}
</script>

<style scoped>
.batch-gen .field-hint {
  font-size: 12px;
  color: var(--xhs-text-secondary);
  margin-top: 4px;
}

.api-config-panel .config-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.api-config-panel .section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}

.config-sub {
  font-size: 13px;
  color: var(--xhs-text-secondary);
}

.config-desc {
  margin-bottom: 16px;
}

.env-template {
  padding: 16px;
  background: var(--xhs-bg);
  border-radius: var(--xhs-radius-sm);
  margin-bottom: 16px;
}

.env-template-title {
  font-size: 13px;
  color: var(--xhs-text-secondary);
  margin-bottom: 10px;
}

.env-code {
  margin: 0;
  padding: 14px 16px;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.7;
  overflow-x: auto;
}

.env-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--xhs-text-secondary);
}

.config-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.config-actions a {
  text-decoration: none;
}

.status-msg {
  margin-top: 12px;
  font-size: 14px;
  color: var(--xhs-text-secondary);
}

.abc-panel {
  border: 1px solid rgba(255, 36, 66, 0.15);
  background: linear-gradient(135deg, rgba(255, 36, 66, 0.03), #fff);
}

.anchor-preview {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  padding: 12px;
  background: var(--xhs-bg);
  border-radius: var(--xhs-radius-sm);
}

.anchor-preview img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 10px;
  border: 2px solid var(--xhs-primary);
}

.anchor-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--xhs-text-secondary);
}

.anchor-info .el-button {
  align-self: flex-start;
}

.anchor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.anchor-hint.batch-count {
  color: var(--xhs-primary);
  font-weight: 600;
}

.anchor-hint {
  color: var(--xhs-text-secondary);
  font-size: 14px;
  margin-bottom: 16px;
}

.abc-form {
  max-width: 640px;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.chip-group-label {
  font-size: 12px;
  color: var(--xhs-text-secondary);
  min-width: 32px;
}

.history-select {
  width: 100%;
}

.seed-paper-hint {
  margin-top: 8px;
  color: #059669;
}

.grid-demo {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--xhs-border);
}

.grid-layout {
  display: grid;
  gap: 6px;
  max-width: 280px;
}

.grid-layout.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-layout.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

.grid-layout.grid-4 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-layout.grid-5 {
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.grid-layout.grid-5 .grid5-cell:nth-child(1) { grid-column: 1 / 4; }
.grid-layout.grid-5 .grid5-cell:nth-child(2) { grid-column: 4 / 7; }
.grid-layout.grid-5 .grid5-cell:nth-child(3) { grid-column: 1 / 3; }
.grid-layout.grid-5 .grid5-cell:nth-child(4) { grid-column: 3 / 5; }
.grid-layout.grid-5 .grid5-cell:nth-child(5) { grid-column: 5 / 7; }

.abc-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px !important;
  padding-bottom: 8px !important;
  margin-bottom: 0 !important;
  background: var(--xhs-bg);
  border-bottom: none !important;
}

.set-header-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.planting-toggle-row {
  line-height: 1.6;
}

.demo-label {
  font-size: 12px;
  color: var(--xhs-text-secondary);
  display: block;
  margin-bottom: 10px;
}

.grid5-cell {
  aspect-ratio: 1;
  background: var(--xhs-primary-soft);
  border: 1px dashed rgba(255, 36, 66, 0.3);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  color: var(--xhs-primary);
  font-weight: 600;
}

.grid5-cell small {
  font-size: 10px;
  font-weight: 500;
  opacity: 0.85;
}

.grid5-cell.method {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.45);
  color: #059669;
}

.grid5-layout {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 6px;
  max-width: 240px;
}

.grid5-cell:nth-child(1) { grid-column: 1 / 4; }
.grid5-cell:nth-child(2) { grid-column: 4 / 7; }
.grid5-cell:nth-child(3) { grid-column: 1 / 3; }
.grid5-cell:nth-child(4) { grid-column: 3 / 5; }
.grid5-cell:nth-child(5) { grid-column: 5 / 7; }

.set-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.set-header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.viral-copy-block {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--xhs-border);
}

.viral-copy-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.viral-copy-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px 12px;
  margin-bottom: 14px;
}

.viral-copy-row.block {
  flex-direction: column;
  align-items: stretch;
}

.viral-label {
  min-width: 40px;
  font-weight: 600;
  font-size: 13px;
  color: var(--xhs-text-secondary);
}

.viral-text {
  flex: 1;
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
}

.viral-tags {
  flex: 1;
}

.abc-set-card .set-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.abc-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.custom-grid-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.field-hint.inline {
  margin: 0;
  white-space: nowrap;
}

.abc-slot.anchor-slot {
  cursor: pointer;
  border-radius: 16px;
  padding: 8px 4px;
  transition: background 0.15s ease;
}

.abc-slot.anchor-slot:hover {
  background: rgba(255, 36, 66, 0.06);
}

.slot-hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--xhs-text-secondary);
  line-height: 1.4;
}

.viral-copy-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--xhs-text-secondary);
  font-size: 13px;
}

.slot-tag {
  display: inline-block;
  padding: 4px 12px;
  margin-bottom: 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.slot-tag.a { background: rgba(255, 36, 66, 0.12); color: #ff2442; }
.slot-tag.b { background: rgba(245, 158, 11, 0.12); color: #d97706; }
.slot-tag.c { background: rgba(16, 185, 129, 0.12); color: #059669; }

.slot-img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 14px;
  border: 1px solid var(--xhs-border);
}

.slot-loading {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--xhs-bg);
  border-radius: 14px;
  font-size: 24px;
  color: var(--xhs-text-secondary);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--xhs-bg);
  border-radius: var(--xhs-radius-sm);
}

.select-hint {
  font-size: 13px;
  font-weight: 400;
  color: var(--xhs-primary);
  margin-left: 12px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.image-card {
  position: relative;
  border: 2px solid var(--xhs-border);
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
}

.image-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--xhs-shadow-lg);
}

.image-card.selected {
  border-color: var(--xhs-primary);
  box-shadow: 0 0 0 3px rgba(255, 36, 66, 0.15);
}

.image-card.is-b { border-color: #f59e0b; }
.image-card.is-c { border-color: #10b981; }

.select-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
}

.select-overlay .el-checkbox,
.select-overlay .preview-btn {
  pointer-events: auto;
}

.select-overlay .el-checkbox {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  padding: 2px 4px;
}

.overlay-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.overlay-tags .preview-btn {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.92);
}

.config-head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.config-collapsed-hint {
  font-size: 13px;
  color: var(--xhs-text-secondary);
  margin-bottom: 12px;
}

.config-collapsed-hint a {
  color: var(--xhs-primary);
}

.image-thumb {
  width: 100%;
  aspect-ratio: 1;
  display: block;
  object-fit: cover;
  user-select: none;
}

.gen-options-panel {
  background: linear-gradient(135deg, rgba(255, 36, 66, 0.02), #fff);
}

.image-gen-tags {
  margin: 0;
  padding: 0 12px 10px;
  font-size: 11px;
  color: var(--xhs-text-secondary);
  line-height: 1.4;
}

.image-meta {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--xhs-text-secondary);
  background: #fafbfc;
}

.empty-state {
  text-align: center;
  padding: 40px 24px !important;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--xhs-text);
  margin-bottom: 6px;
}

.empty-hint {
  margin-top: 4px;
  font-size: 13px;
  color: var(--xhs-text-secondary);
}
</style>
