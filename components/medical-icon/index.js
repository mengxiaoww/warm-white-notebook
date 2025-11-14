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
      this.setData({
        iconUrl: iconUrl || '',
        isMedicalIcon: !!iconUrl
      })
    }
  }
})
