using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CustomControls
{
    public sealed partial class ComponentValueBoxDecimal : UserControl, INotifyPropertyChanged
    {
        public ComponentValueBoxDecimal()
        {
            this.InitializeComponent();

            txtBox.Text = (string)Converter.Convert(ComponentValue, null, null, CultureInfo.CurrentCulture.TwoLetterISOLanguageName); ;

        }

        private string unit;
        public string Unit
        {
            get { return unit; }
            set
            {
                unit = value;
                Header.Text = "Value (" + value + "): ";
            }
        }

        public static DecimalEngrConverter Converter { get; } = new DecimalEngrConverter();


        public string UnitShort { get; set; }
        private bool txtChanged = false;

        public decimal ComponentValue
        {
            get { return (decimal)GetValue(ComponentValueProperty); }
            set
            {
                decimal oldValue = (decimal)GetValue(ComponentValueProperty);
                decimal newValue;

                if (ComponentPrecision != Precision.Arbitrary)
                {
                    if (!isValueAdjustedToPrecision(value))
                        newValue = getNextOrEqualValue(value);
                    else
                        newValue = value;
                }
                else
                    newValue = value;
                
                if (oldValue == newValue) return;

                SetValue(ComponentValueProperty, newValue);

                var args = new ValueChangedEventArgs()
                {
                    PropertyName = "ComponentValue",
                    oldValue = oldValue,
                    newValue = newValue
                };

                ValueChanged?.Invoke(this, args);
                
                txtBox.Text = (string)Converter.Convert(ComponentValue, null, null, CultureInfo.CurrentCulture.TwoLetterISOLanguageName); ;
                
            }
        }
        
        public static readonly DependencyProperty ComponentValueProperty =
          DependencyProperty.Register("ComponentValue",
              typeof(decimal), typeof(ComponentValueBoxDecimal), new PropertyMetadata(1m));


        public Precision ComponentPrecision
        {
            get { return (Precision)GetValue(ComponentPrecisionProperty); }
            set
            {
                Precision oldValue = (Precision)GetValue(ComponentPrecisionProperty);

                if (oldValue == value) return;
                var args = new ValueChangedEventArgs()
                {
                    PropertyName = "ComponentPrecision",
                    oldValue = oldValue,
                    newValue = value
                };

                SetValue(ComponentPrecisionProperty, value);

                if (cmbPrecision.IsDropDownOpen) PrecisionManuallyChanged?.Invoke(this, args);
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("AnyPrecisionSelected"));


                PrecisionChanged?.Invoke(this, args);

                fixValue();
            }
        }

        // Using a DependencyProperty as the backing store for ComponentPrecision.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty ComponentPrecisionProperty =
            DependencyProperty.Register("ComponentPrecision", typeof(Precision),
                    typeof(ComponentValueBoxDecimal), new PropertyMetadata(0));


        public bool AnyPrecisionSelected => (cmbPrecision.SelectedIndex == (int)Precision.Arbitrary);

        public event PropertyChangedEventHandler PropertyChanged;
        public event ValueChangedEventHandler ValueChanged;
        public event ValueChangedEventHandler ValueManuallyChanged;
        public event ValueChangedEventHandler PrecisionChanged;
        public event ValueChangedEventHandler PrecisionManuallyChanged;


        public delegate void ValueChangedEventHandler(object sender, ValueChangedEventArgs args);
        

        private void increaseClick(object sender, RoutedEventArgs e)
        {
            var oldValue = ComponentValue;

            ComponentValue = getNextValue();

            var args = new ValueChangedEventArgs
            {
                oldValue = oldValue,
                newValue = ComponentValue,
                PropertyName = "Value"
            };

            ValueManuallyChanged?.Invoke(this, args);
        }

        private void decreaseClick(object sender, RoutedEventArgs e)
        {
            var oldValue = ComponentValue;

            ComponentValue = getPreviousValue();

            var args = new ValueChangedEventArgs
            {
                oldValue = oldValue,
                newValue = ComponentValue,
                PropertyName = "Value"
            };

            ValueManuallyChanged?.Invoke(this, args);
        }

        private void fixValue()
        {
            if (!AnyPrecisionSelected)
                ComponentValue = getNextOrEqualValue();

        }

        private void showUpDownButtons()
        {
            stkButtonsIncDec.Visibility = Visibility.Visible;
        }

        private void hideUpDownButtons()
        {
            stkButtonsIncDec.Visibility = Visibility.Collapsed;
        }


        private decimal getOneDigitMantissaValue()
        {
            return getOneDigitMantissaValue(ComponentValue);
        }

        private decimal getOneDigitMantissaValue(decimal val)
        {
            var log2 = Math.Log10((double)Math.Abs(val));
        
            int exponent = (int)Math.Floor(log2);
            
            decimal power = DecimalMath.PowerN(10, -1 * exponent);

            return val * power;
        }

        private int getValueExponent()
        {
            return getValueExponent(ComponentValue);
        }

        private int getValueExponent(decimal val)
        {
            var log2 = Math.Log10((double)Math.Abs(val));
            int exponent = (int)Math.Floor(log2);
            return exponent;
        }

        public decimal getNextOrEqualValue()
        {
            return getNextOrEqualValue(ComponentValue);
        }

        public decimal getNextOrEqualValue(decimal val)
        {
            decimal currentOneDigitMantissa = getOneDigitMantissaValue(val);
            
            int exponent = getValueExponent(val);

            foreach (decimal number in arraySelectedPrecision())
            {
                if (number >= currentOneDigitMantissa)
                    return number * DecimalMath.PowerN(10m, exponent);
            }

            decimal output = 10M * arraySelectedPrecision()[0] * DecimalMath.PowerN(10m, exponent);

            if (output > 1E27m)
                output = 1E27m;

            return output;
        }

        public bool isValueAdjustedToPrecision()
        {
            return isValueAdjustedToPrecision(ComponentValue);
        }

        public bool isValueAdjustedToPrecision(decimal val)
        {
            if (ComponentPrecision != Precision.Arbitrary)
            {
                decimal nextEqualValue = getNextOrEqualValue(val);
                return (ComponentValue == nextEqualValue);
            }
            return true;
        }

        public decimal getNextValue()
        {
            decimal currentOneDigitMantissa = getOneDigitMantissaValue();
            int exponent = getValueExponent();

            foreach (decimal number in arraySelectedPrecision())
            {
                if (number > currentOneDigitMantissa)
                    return number * DecimalMath.PowerN(10m, exponent);
            }

            decimal output = arraySelectedPrecision()[0] * 10m;
            output *= DecimalMath.PowerN(10m, exponent);

            if (output > 1E27m)
                output = 1E27m;
            return output;
        }

        public decimal getPreviousValue()
        {
            decimal currentOneDigitMantissa = getOneDigitMantissaValue();
            int exponent = getValueExponent();

            decimal[] reversed = arraySelectedPrecision().Reverse().ToArray();

            foreach (decimal number in reversed)
            {
                if (number < currentOneDigitMantissa)
                    return (number * DecimalMath.PowerN(10m, exponent));
            }

            decimal output = reversed[0] / 10m;
            output *= DecimalMath.PowerN(10m, exponent);

            return output;
        }


        public decimal[] arraySelectedPrecision()
        {
            switch (ComponentPrecision)
            {
                case Precision.p05: return e192;
                case Precision.p1: return e96;
                case Precision.p2: return e48;
                case Precision.p5: return e24;
                case Precision.p10: return e12;
                case Precision.p20: return e6;
                case Precision.p50: return e3;
                default: return new decimal[] { };
            }
        }

        private void precisionChanged(object sender, SelectionChangedEventArgs e)
        {

        }
        

        //standard values por every precision
        //the M suffix is for decimal number type

        public static decimal[] e3 = new decimal[]
            { 1.0M , 2.2M , 4.7M };

        public static decimal[] e6 = new decimal[]
            { 1.0M , 1.5M , 2.2M , 3.3M , 4.7M , 6.8M };

        public static decimal[] e12 = new decimal[]
            { 1.0M , 1.2M , 1.5M , 1.8M , 2.2M , 2.7M,
              3.3M , 3.9M , 4.7M , 5.6M , 6.8M , 8.2M };

        public static decimal[] e24 = new decimal[]
            { 1.0M , 1.1M , 1.2M , 1.3M , 1.5M , 1.6M,
              1.8M , 2.0M , 2.2M , 2.4M , 2.7M , 3.0M,
              3.3M , 3.6M , 3.9M , 4.3M , 4.7M , 5.1M,
              5.6M , 6.2M , 6.8M , 7.5M , 8.2M , 9.1M };

        public static decimal[] e48 = new decimal[]
            { 1.00M, 1.05M, 1.10M, 1.15M, 1.21M, 1.27M,
              1.33M, 1.40M, 1.47M, 1.54M, 1.62M, 1.69M,
              1.78M, 1.87M, 1.96M, 2.05M, 2.15M, 2.26M,
              2.37M, 2.49M, 2.61M, 2.74M, 2.87M, 3.01M,
              3.16M, 3.32M, 3.48M, 3.65M, 3.83M, 4.02M,
              4.22M, 4.42M, 4.64M, 4.87M, 5.11M, 5.36M,
              5.62M, 5.90M, 6.19M, 6.49M, 6.81M, 7.15M,
              7.50M, 7.87M, 8.25M, 8.66M, 9.09M, 9.53M};

        public static decimal[] e96 = new decimal[]
            {
              1.00M, 1.02M, 1.05M, 1.07M, 1.10M, 1.13M,
              1.15M, 1.18M, 1.21M, 1.24M, 1.27M, 1.30M,
              1.33M, 1.37M, 1.40M, 1.43M, 1.47M, 1.50M,
              1.54M, 1.58M, 1.62M, 1.65M, 1.69M, 1.74M,
              1.78M, 1.82M, 1.87M, 1.91M, 1.96M, 2.00M,
              2.05M, 2.10M, 2.15M, 2.21M, 2.26M, 2.32M,
              2.37M, 2.43M, 2.49M, 2.55M, 2.61M, 2.67M,
              2.74M, 2.80M, 2.87M, 2.94M, 3.01M, 3.09M,
              3.16M, 3.24M, 3.32M, 3.40M, 3.48M, 3.57M,
              3.65M, 3.74M, 3.83M, 3.92M, 4.02M, 4.12M,
              4.22M, 4.32M, 4.42M, 4.53M, 4.64M, 4.75M,
              4.87M, 4.99M, 5.11M, 5.23M, 5.36M, 5.49M,
              5.62M, 5.76M, 5.90M, 6.04M, 6.19M, 6.34M,
              6.49M, 6.65M, 6.81M, 6.98M, 7.15M, 7.32M,
              7.50M, 7.68M, 7.87M, 8.06M, 8.25M, 8.45M,
              8.66M, 8.87M, 9.09M, 9.31M, 9.53M, 9.76M};

        public static decimal[] e192 = new decimal[]
            {
              1.00M, 1.01M, 1.02M, 1.04M, 1.05M, 1.06M,
              1.07M, 1.09M, 1.10M, 1.11M, 1.13M, 1.14M,
              1.15M, 1.17M, 1.18M, 1.20M, 1.21M, 1.23M,
              1.24M, 1.26M, 1.27M, 1.29M, 1.30M, 1.32M,
              1.33M, 1.35M, 1.37M, 1.38M, 1.40M, 1.42M,
              1.43M, 1.45M, 1.47M, 1.49M, 1.50M, 1.52M,
              1.54M, 1.56M, 1.58M, 1.60M, 1.62M, 1.64M,
              1.65M, 1.67M, 1.69M, 1.72M, 1.74M, 1.76M,
              1.78M, 1.80M, 1.82M, 1.84M, 1.87M, 1.89M,
              1.91M, 1.93M, 1.96M, 1.98M, 2.00M, 2.03M,
              2.05M, 2.08M, 2.10M, 2.13M, 2.15M, 2.18M,
              2.21M, 2.23M, 2.26M, 2.29M, 2.32M, 2.34M,
              2.37M, 2.40M, 2.43M, 2.46M, 2.49M, 2.52M,
              2.55M, 2.58M, 2.61M, 2.64M, 2.67M, 2.71M,
              2.74M, 2.77M, 2.80M, 2.84M, 2.87M, 2.91M,
              2.94M, 2.98M, 3.01M, 3.05M, 3.09M, 3.12M,
              3.16M, 3.20M, 3.24M, 3.28M, 3.32M, 3.36M,
              3.40M, 3.44M, 3.48M, 3.52M, 3.57M, 3.61M,
              3.65M, 3.70M, 3.74M, 3.79M, 3.83M, 3.88M,
              3.92M, 3.97M, 4.02M, 4.07M, 4.12M, 4.17M,
              4.22M, 4.27M, 4.32M, 4.37M, 4.42M, 4.48M,
              4.53M, 4.59M, 4.64M, 4.70M, 4.75M, 4.81M,
              4.87M, 4.93M, 4.99M, 5.05M, 5.11M, 5.17M,
              5.23M, 5.30M, 5.36M, 5.42M, 5.49M, 5.56M,
              5.62M, 5.69M, 5.76M, 5.83M, 5.90M, 5.97M,
              6.04M, 6.12M, 6.19M, 6.26M, 6.34M, 6.42M,
              6.49M, 6.57M, 6.65M, 6.73M, 6.81M, 6.90M,
              6.98M, 7.06M, 7.15M, 7.23M, 7.32M, 7.41M,
              7.50M, 7.59M, 7.68M, 7.77M, 7.87M, 7.96M,
              8.06M, 8.16M, 8.25M, 8.35M, 8.45M, 8.56M,
              8.66M, 8.76M, 8.87M, 8.98M, 9.09M, 9.20M,
              9.31M, 9.42M, 9.53M, 9.65M, 9.76M, 9.88M
            };

        private void txtLostFocus(object sender, RoutedEventArgs e)
        {
            if (!txtChanged) return;

            string txt = txtBox.Text;
            bool didConvert = true;
            decimal ConvertedValue = 0m;
            try
            {
                ConvertedValue = (decimal)Converter.ConvertBack(txt, null, null, CultureInfo.CurrentCulture.TwoLetterISOLanguageName);
            }
            catch { didConvert = false; }

            if (didConvert)
            {
                if (ConvertedValue <= 0m)
                {
                    txtBox.Text = (string)Converter.Convert(ComponentValue, null, null, CultureInfo.CurrentCulture.TwoLetterISOLanguageName); ;
                    return;
                }

                decimal NewValue = AnyPrecisionSelected ? ConvertedValue : getNextOrEqualValue(ConvertedValue);

                decimal oldValue2 = ComponentValue;
                ComponentValue = ConvertedValue;

                ValueManuallyChanged?.Invoke(this, new ValueChangedEventArgs()
                {
                    oldValue = oldValue2,
                    newValue = ConvertedValue,
                    PropertyName = "Value"
                });
            }
            else
            {
                txtBox.Text = (string)Converter.Convert(ComponentValue, null, null, CultureInfo.CurrentCulture.TwoLetterISOLanguageName); ;

            }


        }

        private void textChanged(object sender, TextChangedEventArgs e)
        {
            txtChanged = true;
        }
    }


    public class PrecisionIntConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, string language)
        {
            //precision to int
            var prec = (Precision)value;
            return (int)prec;

        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
        {
            //int to precision
            var prec = (int)value;

            switch (prec)
            {
                case 0: return Precision.Arbitrary;
                case 1: return Precision.p05;
                case 2: return Precision.p1;
                case 3: return Precision.p2;
                case 4: return Precision.p5;
                case 5: return Precision.p10;
                case 6: return Precision.p20;
                case 7: return Precision.p50;

            }

            return Precision.Arbitrary;

        }
    }
}
