Component({
  properties: {
    markedDates: {
      type: Array,
      value: []
    }
  },

  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    days: []
  },

  lifetimes: {
    attached() {
      this.generateCalendar();
    }
  },

  observers: {
    'markedDates': function(newVal) {
      this.generateCalendar();
    },
    'currentYear, currentMonth': function() {
      this.generateCalendar();
    }
  },

  methods: {
    generateCalendar() {
      const { currentYear, currentMonth, markedDates } = this.data;
      const today = new Date();
      const todayStr = this.formatDate(today);

      // 获取当月第一天和最后一天
      const firstDay = new Date(currentYear, currentMonth - 1, 1);
      const lastDay = new Date(currentYear, currentMonth, 0);

      // 获取当月天数
      const daysInMonth = lastDay.getDate();

      // 获取当月第一天是星期几 (0-6)
      const firstDayWeek = firstDay.getDay();

      // 生成日历数据
      const days = [];

      // 补充上月末尾的日期
      const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0);
      const prevMonthDays = prevMonthLastDay.getDate();

      for (let i = firstDayWeek - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const date = new Date(currentYear, currentMonth - 2, day);
        days.push({
          day,
          fullDate: this.formatDate(date),
          isCurrentMonth: false,
          isToday: false,
          hasRecord: false
        });
      }

      // 当月日期
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth - 1, day);
        const dateStr = this.formatDate(date);
        days.push({
          day,
          fullDate: dateStr,
          isCurrentMonth: true,
          isToday: dateStr === todayStr,
          hasRecord: markedDates.includes(dateStr)
        });
      }

      // 补充下月开头的日期
      const remainingDays = 42 - days.length; // 6行 x 7列 = 42个格子
      for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(currentYear, currentMonth, day);
        days.push({
          day,
          fullDate: this.formatDate(date),
          isCurrentMonth: false,
          isToday: false,
          hasRecord: false
        });
      }

      this.setData({ days });
    },

    formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    prevMonth() {
      let { currentYear, currentMonth } = this.data;
      currentMonth--;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }
      this.setData({ currentYear, currentMonth });
    },

    nextMonth() {
      let { currentYear, currentMonth } = this.data;
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
      this.setData({ currentYear, currentMonth });
    },

    onDayTap(e) {
      const { date } = e.currentTarget.dataset;
      this.triggerEvent('dayselect', { date });
    }
  }
});
