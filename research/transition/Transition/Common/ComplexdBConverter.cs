using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml.Data;

namespace Easycoustics.Transition.Common
{
    public class dBConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, string language)
        {
            //parameter is the dB Reference floor, Eg 20E-6 for dBSPL
            //lin to dB
            decimal decimalValue = (decimal)value;
            decimal reference;

            if (parameter == null) reference = 1m; else reference = (decimal)parameter;

            return 20m * DecimalMath.Log10(decimalValue / reference);
        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
        {
            decimal dBValue = (decimal)value;
            decimal reference;

            if (parameter == null) reference = 1m; else reference = (decimal)parameter;

            return reference * DecimalMath.Power(10m, dBValue / 20m);
        }
    }
}
