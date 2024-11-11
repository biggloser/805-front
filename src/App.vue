<template>
  <el-container class="app-container">
    <!-- 左侧历史对话栏 -->
    <el-aside width="320px" class="chat-aside">
      <div class="aside-header">
        <el-button
          type="primary"
          icon="el-icon-plus"
          @click="createNewChat"
          class="new-chat-button"
        >
          新建对话
        </el-button>
      </div>
      <el-scrollbar class="chat-scrollbar">
        <el-menu
          :default-active="activeChatIndex.toString()"
          class="chat-menu"
          @select="handleChatSelect"
        >
          <el-menu-item
            v-for="(chat, index) in chatHistories"
            :key="index"
            :index="index.toString()"
            class="menu-item"
          >
            <div class="menu-item-content">
              <el-icon class="menu-icon"><ChatLineRound /></el-icon>
              <span class="menu-title">{{ chat.title }}</span>
              <el-tooltip content="删除对话" placement="top">
                <el-icon
                  class="delete-chat-button"
                  @click.stop="deleteChat(index)"
                  circle
                ><Delete /></el-icon>
              </el-tooltip>
            </div>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <!-- 右侧聊天区域 -->
    <el-container class="main-container">
      <!-- 头部 -->
      <el-header class="chat-header">
        <h2>{{ currentChat.title }}</h2>
      </el-header>

      <!-- 主体 -->
      <el-main class="chat-main">
        <div class="chat-content">
          <!-- 左侧聊天窗口 -->
          <div class="chat-window-col">
            <div class="chat-window" ref="chatWindow">
              <div
                v-for="(message, index) in currentChat.messages"
                :key="index"
                :class="['chat-message', message.sender]"
              >
                <el-avatar
                  :src="message.sender === 'user' ? userAvatar : botAvatar"
                  class="message-avatar"
                ></el-avatar>
                <el-card class="message-card">
                  <!-- 文本消息 -->
                  <div v-if="message.type === 'text'">
                    <div v-html="formatMessage(message.content)"></div>
                    <!-- 渲染 objectList 按钮 -->
                    <div v-if="message.objectList && message.objectList.length" class="object-list">
                      <el-button
                        v-for="(item, idx) in message.objectList"
                        :key="idx"
                        type="primary"
                        size="mini"
                        class="object-list-button"
                        @click="handleObjectItemClick(item)"
                      >
                        {{ item }}
                      </el-button>
                    </div>
                  </div>
                  <!-- 音频消息 -->
                  <div v-else-if="message.type === 'audio'">
                    <audio
                      :src="message.content"
                      controls
                      @error="handleAudioError(index)"
                      preload="none"
                    ></audio>
                    <!-- 下载按钮 -->
                    <el-button
                      type="text"
                      icon="el-icon-download"
                      @click="downloadAudio(message.content)"
                      size="mini"
                      class="download-button"
                    ></el-button>
                  </div>
                </el-card>
              </div>
              <!-- 机器人正在输入提示 -->
              <div v-if="isBotTyping" class="chat-message bot typing">
                <el-avatar :src="botAvatar" class="message-avatar"></el-avatar>
                <el-card class="message-card loading-card">
                  <div class="loading-content">
                    <el-icon class="loading-icon">
                      <Loading />
                    </el-icon>
                    <span class="loading-text">正在处理...</span>
                  </div>
                </el-card>
              </div>
            </div>
          </div>

          <!-- 右侧图表 -->
          <div class="graph-container">
            <graph :message="this.highligteq"/>
          </div>
        </div>
      </el-main>

      <!-- 底部输入区域 -->
      <el-footer class="chat-footer">
        <div class="input-area">
          <!-- 切换输入方式按钮 -->
          <el-button
            class="switch-input-mode"
            @click="toggleInputMode"
            circle
            size="default"
            :disabled="isLoading"
          >
            <el-icon>
              <Switch />
            </el-icon>
          </el-button>

          <!-- 文字输入模式 -->
          <el-input
            v-if="inputMode === 'text'"
            v-model="userInput"
            placeholder="请输入消息..."
            @keyup.enter="sendMessage"
            :disabled="isLoading"
            clearable
            class="input-box"
            size="default"
          ></el-input>

          <!-- 语音输入模式 -->
          <div v-else class="voice-input-container">
            <el-button
              class="voice-input-button"
              :class="{ recording: isRecording }"
              @mousedown.prevent="startRecording"
              @touchstart.prevent="startRecording"
              @mouseup.prevent="stopRecording"
              @mouseleave.prevent="cancelRecordingOnLeave"
              @touchend.prevent="stopRecording"
              @touchcancel.prevent="cancelRecording"
              size="default"
              type="primary"
            >
              <el-icon>
                <Microphone />
              </el-icon>
              {{ isRecording ? '点击停止' : '点击录音' }}
            </el-button>
            <div v-if="isRecording" class="recording-indicator">
              <span class="recording-text">正在录音...</span>
              <span class="recording-timer">{{ recordingTime }}</span>
              <el-button
                type="danger"
                size="default"
                @click="cancelRecording"
                class="cancel-button"
              >
                取消
              </el-button>
            </div>
          </div>

          <!-- 发送按钮 (仅在文字模式下显示) -->
          <el-button
            v-if="inputMode === 'text'"
            type="primary"
            @click="sendMessage"
            :loading="isLoading"
            :disabled="!userInput.trim()"
            circle
            class="send-button"
            size="default"
          >
            <el-icon><ChatDotRound /></el-icon>
          </el-button>
        </div>
      </el-footer>
    </el-container>
  </el-container>
</template>

<script>
import axios from 'axios';
import { marked } from 'marked';
import graph from "./components/graph.vue";
import {
  ChatDotRound,
  ChatLineRound,
  Microphone,
  Switch,
  Delete,
  Loading, // 引入 Loading 图标
} from '@element-plus/icons-vue';
import { h } from 'vue';

export default {
  name: 'App',
  components: {
    graph,
    ChatDotRound,
    ChatLineRound,
    Microphone,
    Delete,
    Switch,
    Loading, // 注册 Loading 图标
  },
  data() {
    return {
      chatHistories: [
        {
          title: '新对话',
          messages: [],
        },
      ],
      activeChatIndex: 0,
      userInput: '',
      highligteq:'',
      inputMode: 'text',
      isRecording: false,
      isLoading: false,
      isBotTyping: false,
      mediaRecorder: null,
      audioChunks: [],
      userAvatar: 'https://i.pravatar.cc/150?img=3',
      botAvatar: 'https://i.pravatar.cc/150?img=12',
      recordingTime: '00:00',
      timerInterval: null,
      isCanceled: false,
    };
  },
  computed: {
    currentChat() {
      return this.chatHistories[this.activeChatIndex];
    },
  },
  methods: {
    /**
     * 切换输入模式（文字/语音）
     */
    toggleInputMode() {
      this.inputMode = this.inputMode === 'text' ? 'voice' : 'text';
    },

    /**
     * 发送文字消息
     */
    sendMessage() {
      if (this.inputMode === 'text' && !this.userInput.trim()) {
        this.$message.warning('请输入消息');
        return;
      }

      const messageContent = this.userInput.trim();
      this.userInput = '';

      if (this.inputMode === 'text') {
        // 添加用户文本消息
        this.currentChat.messages.push({
          sender: 'user',
          type: 'text',
          content: messageContent,
        });
      }

      this.isLoading = true;
      this.isBotTyping = true;
      this.scrollToBottom();

      // 与后端交互
      axios
        .post('http://127.0.0.1:8000/task_handler/', { message: messageContent })
        .then((response) => {
          const botReply = response.data.reply || '机器人没有返回消息';

          // 检查 object_list 是否存在
          const objectList = response.data.object_list || [];

          // 添加机器人的文本回复
          this.currentChat.messages.push({
            sender: 'bot',
            type: 'text',
            content: botReply,
            objectList: objectList,
          });

          this.scrollToBottom();
        })
        .catch((error) => {
          this.$message.error('请求失败：' + error.message);
        })
        .finally(() => {
          this.isLoading = false;
          this.isBotTyping = false;
        });
    },

    /**
     * 处理 objectList 中按钮的点击事件
     * @param {Object} item - 被点击的对象项
     */
    handleObjectItemClick(item) {
      this.isLoading = true;
      this.isBotTyping = true;
      this.highligteq = item;

      // 将用户的选择添加到聊天记录
      this.currentChat.messages.push({
        sender: 'user',
        type: 'text',
        content: item,
      });

      this.scrollToBottom();

      // 与后端交互，发送选中的项
      axios
        .post('http://127.0.0.1:8000/continue_task_handler/', { selection: item })
        .then((response) => {
          const botReply = response.data.content || '机器人没有返回消息';

          // 检查 object_list 是否存在
          const objectList = response.data.object_list || [];

          // 添加机器人的文本回复
          this.currentChat.messages.push({
            sender: 'bot',
            type: 'text',
            content: botReply,
            objectList: objectList,
          });

          this.scrollToBottom();
        })
        .catch((error) => {
          this.$message.error('请求失败：' + error.message);
        })
        .finally(() => {
          this.isLoading = false;
          this.isBotTyping = false;
        });
    },

    /**
     * 开始录音
     */
    async startRecording() {
      if (this.isRecording) return;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.$message.error('当前浏览器不支持录音功能');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.isCanceled = false; // 重置取消标志
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          if (this.isCanceled || this.audioChunks.length === 0) {
            // 如果录音被取消或没有录音数据，不发送
            stream.getTracks().forEach((track) => track.stop()); // 停止所有音频轨道
            return;
          }
          const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          const audioUrl = URL.createObjectURL(audioBlob);
          this.sendAudio(audioBlob, audioUrl);
          stream.getTracks().forEach((track) => track.stop()); // 停止所有音频轨道
        };

        // 开始录音
        this.mediaRecorder.start();
        this.isRecording = true;
        this.recordingTime = '00:00';
        this.startTimer();
      } catch (error) {
        console.error('录音错误:', error);
        this.$message.error('无法访问麦克风，请检查权限设置');
      }
    },

    /**
     * 停止录音
     */
    stopRecording() {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.stopTimer();
      }
    },

    /**
     * 取消录音
     */
    cancelRecording() {
      if (this.mediaRecorder && this.isRecording) {
        this.isCanceled = true; // 设置取消标志
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.audioChunks = []; // 清空录音数据
        this.stopTimer();
        this.$message.info('录音已取消');
      }
    },

    /**
     * 鼠标离开按钮时取消录音
     */
    cancelRecordingOnLeave() {
      if (this.mediaRecorder && this.isRecording) {
        this.isCanceled = true; // 设置取消标志
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.audioChunks = []; // 清空录音数据
        this.stopTimer();
        this.$message.info('录音已取消');
      }
    },

    /**
     * 发送音频消息
     * @param {Blob} audioBlob - 录音的 Blob 对象
     * @param {String} audioUrl - 录音的 Blob URL
     */
    sendAudio(audioBlob, audioUrl) {
      // 添加用户音频消息
      this.currentChat.messages.push({
        sender: 'user',
        type: 'audio',
        content: audioUrl,
      });

      this.isLoading = true;
      this.isBotTyping = true;
      this.scrollToBottom();

      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      // 与后端交互，发送音频文件
      axios
        .post('http://127.0.0.1:8000/task_handler/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        .then((response) => {
          const botReply = response.data.content || '机器人没有返回消息';

          // 检查 object_list 是否存在
          const objectList = response.data.object_list || [];

          // 添加机器人的文本回复
          this.currentChat.messages.push({
            sender: 'bot',
            type: 'text',
            content: botReply,
            objectList: objectList,
          });

          this.scrollToBottom();
        })
        .catch((error) => {
          console.error('后端请求失败:', error);
          this.$message.warning('后端服务不可用，音频已保存到本地。');
        })
        .finally(() => {
          this.isLoading = false;
          this.isBotTyping = false;
        });
    },

    /**
     * 下载音频消息
     * @param {String} audioUrl - 音频的 Blob URL
     */
    downloadAudio(audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = 'recording.webm';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    /**
     * 选择不同的聊天记录
     * @param {String} index - 聊天记录的索引
     */
    handleChatSelect(index) {
      this.activeChatIndex = parseInt(index);
    },

    /**
     * 创建新的聊天记录
     */
    createNewChat() {
      this.chatHistories.push({
        title: `新对话 ${this.chatHistories.length + 1}`,
        messages: [],
      });
      this.activeChatIndex = this.chatHistories.length - 1;
    },

    /**
     * 删除聊天记录
     * @param {Number} index - 要删除的聊天记录的索引
     */
    deleteChat(index) {
      this.$confirm('此操作将永久删除该对话, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          this.chatHistories.splice(index, 1);
          if (index === this.activeChatIndex) {
            this.activeChatIndex = 0;
          } else if (index < this.activeChatIndex) {
            this.activeChatIndex -= 1;
          }
          this.$message({
            type: 'success',
            message: '删除成功!',
          });
        })
        .catch(() => {});
    },

    /**
     * 滚动到聊天窗口底部
     */
    scrollToBottom() {
      this.$nextTick(() => {
        const chatWindow = this.$refs.chatWindow;
        if (chatWindow) {
          chatWindow.scrollTop = chatWindow.scrollHeight;
        }
      });
    },

    /**
     * 格式化消息内容（支持 Markdown）
     * @param {String} content - 消息内容
     * @returns {String} - 格式化后的 HTML
     */
    formatMessage(content) {
      return marked.parse(content || '');
    },

    /**
     * 开始录音计时
     */
    startTimer() {
      let seconds = 0;
      this.timerInterval = setInterval(() => {
        seconds += 1;
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        this.recordingTime = `${mins}:${secs}`;
      }, 1000);
    },

    /**
     * 停止录音计时
     */
    stopTimer() {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    },

    /**
     * 处理音频播放错误
     * @param {Number} index - 消息索引
     */
    handleAudioError(index) {
      this.$message.error(`无法播放音频消息（索引：${index}）。请尝试重新录制或检查浏览器支持情况。`);
    },
  },
  beforeDestroy() {
    this.stopTimer();
    if (this.mediaRecorder) {
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  },
};
</script>

<style scoped>
/* 样式代码保持不变 */

/* 新增样式 */
.object-list {
  margin-top: 10px;
}

.object-list-button {
  margin-right: 5px;
  margin-bottom: 5px;
}

/* Loading Animation Styles */
.loading-card {
  display: flex;
  align-items: center;
  background-color: #f0f0f0;
}

.loading-content {
  display: flex;
  align-items: center;
}

.loading-icon {
  font-size: 24px;
  color: #3498db;
  animation: rotate 1s linear infinite;
  margin-right: 10px;
}

.loading-text {
  font-size: 16px;
  color: #555;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

/* Reset and Base Styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background-color: #f5f5f5;
}

/* 整体布局 */
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: row;
  background: #f5f5f5;
}

/* 左侧历史对话栏 */
.chat-aside {
  background-color: #2c3e50;
  color: #ecf0f1;
  padding: 20px 15px;
  display: flex;
  flex-direction: column;
}

.aside-header {
  margin-bottom: 20px;
  text-align: center;
}

.new-chat-button {
  width: 100%;
  font-weight: 600;
  background-color: #3498db;
  border-color: #2980b9;
  transition: background-color 0.3s, border-color 0.3s;
}

.new-chat-button:hover {
  background-color: #2980b9;
  border-color: #1f618d;
}

.chat-scrollbar {
  flex: 1;
  overflow: hidden;
}

.chat-menu {
  background-color: transparent;
  border-right: none;
}

.menu-item {
  padding: 10px 15px !important;
  border-radius: 8px;
  transition: background-color 0.3s;
}

.menu-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.menu-icon {
  margin-right: 10px;
  font-size: 20px;
  color: #3498db;
}

.menu-title {
  flex: 1;
  color: #ecf0f1;
  font-size: 16px;
  margin-right: 10px;
}

.delete-chat-button {
  color: #e74c3c;
  font-size: 16px;
  cursor: pointer;
  transition: color 0.3s;
}

.delete-chat-button:hover {
  color: #c0392b;
}

.menu-item.is-active {
  background-color: #34495e !important;
}

.menu-item:hover {
  background-color: #3d566e !important;
}

/* 右侧聊天区域 */
.main-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
}

.chat-header {
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  padding: 20px 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chat-header h2 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 700;
}

/* 主体部分 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.chat-content {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px 30px;
  box-sizing: border-box;
  height: 100%;
}

.chat-window-col {
  flex: 3;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-window {
  flex: 1;
  background-color: #ecf0f1;
  overflow-y: auto;
  padding: 20px;
  border-radius: 12px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: background-color 0.3s;
}

.chat-window:hover {
  background-color: #dfe6e9;
}

.graph-container {
  flex: 2;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  overflow: hidden;
}

/* 消息样式 */
.chat-message {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20px;
}

.chat-message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  margin: 0 15px;
  flex-shrink: 0;
}

.message-card {
  max-width: 70%;
  padding: 15px 20px;
  border-radius: 20px;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: background-color 0.3s, transform 0.3s;
}

.message-card:hover {
  background-color: #f1f2f6;
  transform: translateY(-2px);
}

.chat-message.user .message-card {
  background-color: #3498db;
  color: #ffffff;
}

.chat-message.bot .message-card {
  background-color: #ffffff;
  color: #2c3e50;
}

.message-card .el-card__body {
  padding: 0;
}

.typing .message-card {
  background-color: #f0f0f0;
}

.typing .message-card::after {
  content: '';
  position: absolute;
  bottom: 10px;
  left: -10px;
  width: 0;
  height: 0;
  border-top: 10px solid #f0f0f0;
  border-right: 10px solid transparent;
}

/* 底部输入区域 */
.chat-footer {
  background-color: #ffffff;
  border-top: 1px solid #e0e0e0;
  padding: 20px 30px;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
}

.input-area {
  display: flex;
  align-items: center;
}

.switch-input-mode {
  margin-right: 15px;
  background-color: #bdc3c7;
  color: #2c3e50;
  transition: background-color 0.3s, color 0.3s;
}

.switch-input-mode:hover {
  background-color: #95a5a6;
  color: #ffffff;
}

.input-box {
  flex: 1;
  margin-right: 15px;
}

.voice-input-container {
  flex: 1;
  margin-right: 15px;
}

.voice-input-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2ecc71;
  color: #ffffff;
  transition: background-color 0.3s;
}

.voice-input-button.recording {
  background-color: #e74c3c;
}

.voice-input-button:hover {
  background-color: #27ae60;
}

.voice-input-button.recording:hover {
  background-color: #c0392b;
}

.send-button {
  background-color: #e74c3c;
  color: #ffffff;
  transition: background-color 0.3s;
}

.send-button:hover {
  background-color: #c0392b;
}

/* 录音指示器 */
.recording-indicator {
  display: flex;
  align-items: center;
  margin-top: 10px;
}

.recording-text {
  font-size: 14px;
  color: #e74c3c;
  margin-right: 8px;
}

.recording-timer {
  font-size: 14px;
  color: #7f8c8d;
}

.cancel-button {
  margin-left: 10px;
}

/* 下载按钮样式 */
.download-button {
  margin-top: 5px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .chat-content {
    flex-direction: column;
    gap: 15px;
  }

  .chat-aside {
    width: 250px;
  }
}

@media (max-width: 768px) {
  .chat-aside {
    width: 200px;
  }

  .chat-header h2 {
    font-size: 20px;
  }

  .message-card {
    max-width: 80%;
  }

  .graph-container {
    flex: 1.5;
  }
}

@media (max-width: 480px) {
  .app-container {
    flex-direction: column;
  }

  .chat-aside {
    width: 100%;
    height: 200px;
    order: 2;
  }

  .main-container {
    order: 1;
  }

  .chat-content {
    padding: 10px 15px;
    gap: 10px;
  }

  .graph-container {
    padding: 15px;
  }

  .chat-footer {
    padding: 15px 20px;
  }

  .send-button {
    padding: 0 10px;
  }

  .graph-container {
    flex: 1;
  }

  .details-section {
    height: 35vh;
  }
}

/* 细节优化 */
.el-table th {
  background-color: #fafafa;
  color: #333333;
}

.el-table td {
  background-color: #ffffff;
  color: #555555;
}

.details-card .el-card__header {
  background-color: #f5f5f5;
  border-bottom: none;
  font-size: 18px;
  font-weight: bold;
  color: #333333;
}

.details-card .el-card__body {
  padding: 0;
}

.el-card {
  border: none;
}

.el-button {
  border-radius: 4px;
}
</style>
