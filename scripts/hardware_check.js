
import { exec } from 'child_process';
import fs from 'fs';

console.log("🔍 --- 开始树莓派硬件自检 ---");

// 1. 检查 espeak (语音)
console.log("\n1. [语音测试] 正在检查 espeak...");
exec('which espeak', (err, stdout) => {
    if (err) {
        console.error("❌ 错误: 未找到 'espeak' 命令！");
        console.error("👉 解决方法: 请运行 sudo apt-get install espeak");
    } else {
        console.log(`✅ espeak 已安装: ${stdout.trim()}`);
        console.log("🔊 正在尝试播放测试音... (请听是否有声音)");
        // 尝试强制指定 stdout 以防缓冲区满，同时尝试使用 aplay 管道（备选方案）
        exec('espeak -v zh "系统声音测试" --stdout | aplay', (e) => {
           if(e) console.log("⚠️ 管道播放失败，尝试直接播放...");
           exec('espeak -v zh "系统声音测试"', (error) => {
               if (error) console.error("❌ 播放失败:", error.message);
               else console.log("✅ 播放命令已发送。如果没听到声音，请检查树莓派音频输出设置 (sudo raspi-config)。");
           });
        });
    }
});

// 2. 检查 GPIO (台灯)
console.log("\n2. [GPIO测试] 正在检查 pinctrl...");
const LAMP_PIN = 26; // 修正为 26
const PINCTRL_CMD = fs.existsSync('/usr/bin/pinctrl') ? '/usr/bin/pinctrl' : 'pinctrl';

exec(`${PINCTRL_CMD} get ${LAMP_PIN}`, (err, stdout) => {
    if (err) {
        console.error(`❌ 错误: 未找到 '${PINCTRL_CMD}' 命令或引脚不可访问！`);
        console.error("👉 说明: 新版 Raspberry Pi OS (Bookworm) 使用 pinctrl。");
        console.error("👉 旧版系统: 如果您使用旧版系统，可能需要安装 'raspi-gpio' 或修改 server.js 使用 'gpio' 命令。");
    } else {
        console.log(`✅ pinctrl 可用。当前引脚状态: ${stdout.trim()}`);
        console.log("💡 正在尝试闪烁台灯 (Pin ${LAMP_PIN})...");
        
        // 尝试开灯
        exec(`${PINCTRL_CMD} set ${LAMP_PIN} op dh`, (e1) => {
            if(e1) console.error("❌ 开灯失败:", e1.message);
            else {
                console.log("🔦 灯应已亮起 (High)");
                setTimeout(() => {
                    // 2秒后关灯
                    exec(`${PINCTRL_CMD} set ${LAMP_PIN} dl`, (e2) => {
                        console.log("🌑 灯应已熄灭 (Low)");
                        console.log("\n自检完成。");
                    });
                }, 2000);
            }
        });
    }
});
