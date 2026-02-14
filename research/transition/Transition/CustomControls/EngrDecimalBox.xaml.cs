using Easycoustics.Transition.Common;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
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
    public sealed partial class EngrDecimalBox : UserControl, INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler PropertyChanged;
        public event ValueChangedEventDelegate ValueManuallyChanged;

        public delegate void ValueChangedEventDelegate(object obj, ValueChangedEventArgs args);

        public static DecimalEngrConverter Converter { get; } = new DecimalEngrConverter();
        



        public decimal Value
        {
            get { return (decimal)GetValue(ValueProperty); }
            set
            {
                decimal oldValue = value;
                SetValue(ValueProperty, value);
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("Value"));
              
            }
        }

        public static readonly DependencyProperty ValueProperty =
            DependencyProperty.Register("Value",
                typeof(decimal), typeof(EngrDecimalBox), new PropertyMetadata(1m, PropertyChangedCallback));

        public static void PropertyChangedCallback(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            if (e.NewValue != e.OldValue)
            {
                string newString = (string)Converter.Convert((decimal)e.NewValue, null, null, CultureInfo.CurrentCulture.TwoLetterISOLanguageName);
                (d as EngrDecimalBox).txtBox.Text = newString;
                (d as EngrDecimalBox).txtChanged = false;
            }

        }



        public string Header
        {
            get { return (string)GetValue(HeaderProperty); }
            set { SetValue(HeaderProperty, value); }
        }

        // Using a DependencyProperty as the backing store for Header.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty HeaderProperty =
            DependencyProperty.Register("Header", typeof(string), typeof(EngrDecimalBox), new PropertyMetadata(""));

        


        public bool AllowNegativeNumber { get; set; } = false;
        public bool AllowPositiveNumber { get; set; } = true;
        public decimal MaximumNumberAllowed { get; set; } = decimal.MaxValue;
        public decimal MinimumNumberAllowed { get; set; } = decimal.MinValue;
        private bool txtChanged = false;

        public EngrDecimalBox()
        {
            this.InitializeComponent();
        }
        
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
                if (!AllowNegativeNumber && (ConvertedValue < 0)) ConvertedValue *= -1;
                if (!AllowPositiveNumber && (ConvertedValue > 0)) ConvertedValue *= -1;

                if (!AllowNegativeNumber && !AllowPositiveNumber)
                    throw new InvalidOperationException("Both Negative and Positive numbers are disallowed");

                if (ConvertedValue > MaximumNumberAllowed) ConvertedValue = MaximumNumberAllowed;
                if (ConvertedValue < MinimumNumberAllowed) ConvertedValue = MinimumNumberAllowed;

                if (MinimumNumberAllowed >= MaximumNumberAllowed)
                    throw new InvalidOperationException("Minimum allowed number is greater or equal than maximum allowed");

                decimal oldValue = Value;
                Value = ConvertedValue;
                ValueManuallyChanged?.Invoke(this, new ValueChangedEventArgs()
                {
                    oldValue = oldValue,
                    newValue = ConvertedValue,
                    PropertyName = "Value"
                });
            }
            
            txtBox.Text = (string)Converter.Convert(Value, null, null, CultureInfo.CurrentCulture.TwoLetterISOLanguageName); ;
            
            
        }

        private void textChanged(object sender, TextChangedEventArgs e)
        {
            txtChanged = true;
        }
    }
}
