<template>
  <div class="graph-wrapper">
    <!-- ECharts 图表容器 -->
    <div ref="chart" class="chart-container"></div>

    <!-- 节点详细信息表格 -->
    <div class="detail-table-wrapper">
      <el-table
        :data="selectedNodeData"
        border
        size="medium"
        stripe
        empty-text="请选择节点查看详细信息"
      >
        <el-table-column prop="field" label="字段" width="150"></el-table-column>
        <el-table-column prop="value" label="值"></el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts';
import axios from 'axios';
import { ElMessage, ElTable, ElTableColumn } from 'element-plus';
export default {
  name: 'Graph',
  components: {
    ElTable,
    ElTableColumn,
  },
  props: {
    message: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      option: {
        backgroundColor: '#ffffff',
        title: {
          text: '知识图谱',
          left: 'center',
          top: 20,
          textStyle: {
            color: '#333333',
            fontSize: 24,
            fontWeight: 'bold',
          },
        },
        tooltip: {
          trigger: 'item',
          formatter: function (params) {
            if (params.dataType === 'node') {
              return `
                <strong>ID:</strong> ${params.data.id}<br/>
                <strong>名称:</strong> ${params.data.name || '未命名'}<br/>
                <strong>别名:</strong> ${params.data.alias || '无'}<br/>
                <strong>代码:</strong> ${params.data.code || '无'}<br/>
                <strong>类型:</strong> ${params.data.type || '未知'}<br/>
                <strong>信息:</strong> ${params.data.info || '无'}<br/>
                <strong>类别:</strong> ${params.data.category || '未知类型'}<br/>
              `;
            } else if (params.dataType === 'edge') {
              return `
                <strong>关联:</strong> ${params.data.label || '无'}
              `;
            }
          },
          backgroundColor: 'rgba(50, 50, 50, 0.7)',
          textStyle: {
            color: '#ffffff',
          },
          extraCssText: 'box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);',
        },
        series: [
          {
            type: 'graph',
            layout: 'force',
            roam: true,
            focusNodeAdjacency: true,
            force: {
              repulsion: 1000,
              edgeLength: [50, 200],
              gravity: 0.1,
            },
            zoom: 0.6,
            symbolSize: 30,
            label: {
              show: true,
              color: '#333333',
              fontSize: 14,
              formatter: '{b}',
            },
            edgeSymbol: ['none', 'arrow'],
            edgeSymbolSize: [0, 10],
            edgeLabel: {
              fontSize: 12,
              show: true,
              color: '#555555',
              formatter: function (params) {
                return params.data.label;
              },
            },
            itemStyle: {
              borderColor: '#ffffff',
              borderWidth: 2,
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
            lineStyle: {
              color: '#888888',
              opacity: 0.6,
              width: 2,
              curveness: 0.2,
            },
            data: [],
            links: [],
            emphasis: {
              label: {
                show: true,
                fontSize: 16,
                color: '#000000',
              },
              lineStyle: {
                width: 4,
                color: '#FFD700',
              },
            },
          },
        ],
      },
      chart: null,
      data: [],
      selectedNodeData: [],
      nodesData: [],
      pendingNodeId: null,
    };
  },
  mounted() {
    this.initChart();
    this.fetchData();
    window.addEventListener('resize', this.resizeChart);

    //this.chart.on('finished', this.onChartFinished);

    this.$watch(
      () => this.message,
      (newVal) => {
        if (!newVal) return;
        this.highlightNodeByName(newVal);
      }
    );
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeChart);
    if (this.chart) this.chart.dispose();
  },
  methods: {
    initChart() {
      this.chart = echarts.init(this.$refs.chart);
      this.chart.setOption(this.option);
      this.chart.on('click', this.handleChartClick);
    },
    resizeChart() {
      if (this.chart) this.chart.resize();
    },
    fetchData() {
      axios
        .get('http://127.0.0.1:8080/graph/getGraphData')
        .then((response) => {
          const data = response.data;
          this.processData(data);
        })
        .catch((error) => {
          ElMessage.error('请求失败，请检查网络连接');
          this.fetchLocalData();
        });
    },
    fetchLocalData() {
      axios
        .get('/data.json')
        .then((response) => {
          const data = response.data;
          this.processData(data);
        })
        .catch((error) => {
          ElMessage.error('本地数据获取失败');
        });
    },
    processData(data) {
      if (!data || !data.waritem || !data.edge) {
        ElMessage.error('数据格式不正确');
        return;
      }

      const nodes = data.waritem.map((item) => ({
        id: item.id,
        name: item.name,
        alias: item.alias,
        code: item.code,
        type: item.type,
        info: item.info,
        category: item.type,
        symbolSize: 30,
      }));

      const edges = data.edge.map((item) => ({
        source: item.from,
        target: item.to,
        label: item.label,
      }));

      this.option.series[0].data = nodes;
      this.option.series[0].links = edges;
      this.nodesData = nodes;

      this.chart.setOption(this.option, true);
    },
    handleChartClick(params) {
      if (params.dataType === 'node') {
        const node = params.data;
        this.selectedNodeData = [
          { field: 'ID', value: node.id || '无' },
          { field: '名称', value: node.name || '未命名' },
          { field: '别名', value: node.alias || '无' },
          { field: '代码', value: node.code || '无' },
          { field: '类型', value: node.type || '未知' },
          { field: '信息', value: node.info || '无' },
          { field: '类别', value: node.category || '未知类型' },
        ];
      } else {
        this.selectedNodeData = [];
      }
    },
    highlightNodeByName(name) {
      const sanitizedName = name.replace(/[-\s]/g, '').toLowerCase();
      const nodeIndex = this.nodesData.findIndex((n) => {
        const nodeName = n.name.replace(/[-\s]/g, '').toLowerCase();
        return nodeName.includes(sanitizedName) || sanitizedName.includes(nodeName);
      });

      if (nodeIndex !== -1) {
        const node = this.nodesData[nodeIndex];
        this.selectedNodeData = [
          { field: 'ID', value: node.id || '无' },
          { field: '名称', value: node.name || '未命名' },
          { field: '别名', value: node.alias || '无' },
          { field: '代码', value: node.code || '无' },
          { field: '类型', value: node.type || '未知' },
          { field: '信息', value: node.info || '无' },
          { field: '类别', value: node.category || '未知类型' },
        ];
        this.highlightNode(node.id);
        this.pendingNodeId = node.id;

        setTimeout(() => {
          this.unhighlightNode(node.id);
        }, 5000);
      } else {
        ElMessage.warning('未找到匹配的节点');
      }
    },
    highlightNode(nodeId) {
      const nodes = this.option.series[0].data.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            symbolSize: 50,
            itemStyle: {
              color: '#FF7F50',
              borderColor: '#FFD700',
              borderWidth: 6,
              shadowBlur: 20,
              shadowColor: 'rgba(255, 215, 0, 0.8)',
            },
          };
        }
        return node;
      });

      this.option.series[0].data = nodes;
      this.chart.setOption(this.option);
    },
    unhighlightNode(nodeId) {
      const nodes = this.option.series[0].data.map((node) => {
        if (node.id === nodeId) {
          const { itemStyle,symbolSize,...rest } = node;
          return rest;
        }
        return node;
      });

      this.option.series[0].data = nodes;
      this.chart.setOption(this.option);
    },
    centerNode(nodeId) {
      const graph = this.chart.getModel().getSeriesByIndex(0).getGraph();
      const nodeData = graph.getNodeById(nodeId);
      if (!nodeData) return;

      const position = nodeData.getLayout();
      if (!position) return;

      const point = this.chart.convertToPixel({ seriesIndex: 0 }, position);
      const dom = this.chart.getDom();
      const center = [dom.offsetWidth / 2, dom.offsetHeight / 2];

      const offset = [center[0] - point[0], center[1] - point[1]];
      const zoom = this.chart.getOption().series[0].zoom || 1;
      const adjustedOffset = [offset[0] / zoom, offset[1] / zoom];

      this.chart.dispatchAction({
        type: 'graphRoam',
        seriesIndex: 0,
        zoom: zoom * 1.2,
        moveX: adjustedOffset[0],
        moveY: adjustedOffset[1],
      });
    },
    onChartFinished() {
      if (this.pendingNodeId) {
        this.centerNode(this.pendingNodeId);
        this.pendingNodeId = null;
      }
    },
  },
};
</script>

<style scoped>
.graph-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: #f0f2f5;
  padding: 20px;
  box-sizing: border-box;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.chart-container {
  height: 60vh;
  background-color: #ffffff;
  border-radius: 12px;
  overflow: hidden;
}

.detail-table-wrapper {
  margin-top: 20px;
  background-color: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.detail-table-wrapper .el-table {
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
}

.detail-table-wrapper .el-table th {
  background-color: #fafafa;
  color: #333;
  font-weight: bold;
}

.detail-table-wrapper .el-table td {
  color: #666;
}

.detail-table-wrapper .el-table__body-wrapper::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.detail-table-wrapper .el-table__body-wrapper::-webkit-scrollbar-thumb {
  background-color: rgba(144, 147, 153, 0.3);
  border-radius: 3px;
}

.detail-table-wrapper .el-table__body-wrapper::-webkit-scrollbar-track {
  background-color: transparent;
}

@media (max-width: 768px) {
  .graph-wrapper {
    padding: 10px;
  }

  .chart-container {
    height: 50vh;
  }

  .detail-table-wrapper {
    margin-top: 10px;
  }
}
</style>