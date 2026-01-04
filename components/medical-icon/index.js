import { MEDICAL_ICONS, getMedicalIcon } from '../../utils/medical-icons'

Component({
  properties: {
    name: {
      type: String,
      value: ''
    },
    size: {
      type: Number,
      value: 40
    },
    color: {
      type: String,
      value: '#000'
    },
    className: {
      type: String,
      value: ''
    }
  },

  data: {
    iconUrl: '',
    isMedicalIcon: false
  },

  observers: {
    'name': function(newName) {
      const iconUrl = getMedicalIcon(newName)
      this.setData({
        iconUrl: iconUrl || '',
        isMedicalIcon: !!iconUrl
      })
    }
  },

  lifetimes: {
    attached() {
      const iconUrl = getMedicalIcon(this.properties.name)
      console.log('🎨 [medical-icon] 图标名称:', this.properties.name, '图标URL前50字符:', iconUrl ? iconUrl.substring(0, 50) : 'null')
      this.setData({
        iconUrl: iconUrl || '',
        isMedicalIcon: !!iconUrl
      })
    }
  }
})
