const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 10000;

// 中间件
app.use(cors({
  origin: ['https://melolo.cc', 'http://localhost:3000'], // 允许你的域名
  credentials: true
}));
app.use(express.json());

// 健康检查端点
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Melolo YouTube Downloader API is running!' 
  });
});

// 获取视频信息
app.post('/api/video-info', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '请提供YouTube视频链接' });
    }

    console.log('获取视频信息:', url);
    
    const info = await ytdl.getInfo(url);
    
    const videoInfo = {
      title: info.videoDetails.title,
      duration: info.videoDetails.lengthSeconds,
      thumbnail: info.videoDetails.thumbnails?.[0]?.url || '',
      author: info.videoDetails.author.name,
      viewCount: info.videoDetails.viewCount,
      formats: info.formats
        .filter(format => format.hasVideo && format.hasAudio && format.container === 'mp4')
        .map(format => ({
          quality: format.qualityLabel || 'unknown',
          itag: format.itag,
          container: format.container,
          filesize: format.contentLength
        }))
        .sort((a, b) => {
          const qualityOrder = { '1080p': 4, '720p': 3, '480p': 2, '360p': 1 };
          return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
        })
    };
    
    res.json(videoInfo);
  } catch (error) {
    console.error('获取视频信息失败:', error.message);
    res.status(500).json({ 
      error: '获取视频信息失败',
      details: error.message 
    });
  }
});

// 获取下载链接
app.post('/api/download-link', async (req, res) => {
  try {
    const { url, quality } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '请提供YouTube视频链接' });
    }

    console.log('获取下载链接:', url, 'quality:', quality);
    
    const info = await ytdl.getInfo(url);
    
    // 查找指定质量的格式
    let format = info.formats.find(f => 
      f.qualityLabel === quality && 
      f.hasVideo && 
      f.hasAudio && 
      f.container === 'mp4'
    );
    
    // 如果没找到指定质量，使用最佳质量
    if (!format) {
      format = info.formats.find(f => 
        f.hasVideo && 
        f.hasAudio && 
        f.container === 'mp4'
      );
    }
    
    if (!format) {
      return res.status(404).json({ error: '未找到可用的视频格式' });
    }
    
    res.json({
      downloadUrl: format.url,
      title: info.videoDetails.title,
      quality: format.qualityLabel,
      filesize: format.contentLength
    });
    
  } catch (error) {
    console.error('获取下载链接失败:', error.message);
    res.status(500).json({ 
      error: '获取下载链接失败',
      details: error.message 
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`访问 http://localhost:${PORT} 查看API状态`);
});
