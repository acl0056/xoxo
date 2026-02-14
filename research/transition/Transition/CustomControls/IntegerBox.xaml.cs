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
    public sealed partial class IntegerBox : UserControl, INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler PropertyChanged;
        public event ValueChangedEventDelegate ValueManuallyChanged;

        public delegate void ValueChangedEventDelegate(object obj, ValueChangedEventArgs args);

        public int Value
        {
            get { return (int)GetValue(ValueProperty); }
            set { SetValue(ValueProperty, value); }
        }

        // Using a DependencyProperty as the backing store for Value.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty ValueProperty =
            DependencyProperty.Register("Value", typeof(int), typeof(IntegerBox), new PropertyMetadata(1, PropertyChangedCallback));



        public static void PropertyChangedCallback(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            if (e.NewValue != e.OldValue)
            {
                string newString = ((int)e.NewValue).ToString();
                (d as IntegerBox).txtBox.Text = newString;
                (d as IntegerBox).txtChanged = false;
            }

        }





        public string Header
        {
            get { return (string)GetValue(HeaderProperty); }
            set { SetValue(HeaderProperty, value); }
        }

        // Using a DependencyProperty as the backing store for Header.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty HeaderProperty =
            DependencyProperty.Register("Header", typeof(string), typeof(IntegerBox), new PropertyMetadata(""));

        public bool AllowNegativeNumber { get; set; }
        private bool txtChanged = false;

        public int MaximumNumberAllowed { get; set; } = int.MaxValue;
        public int MinimumNumberAllowed { get; set; } = int.MinValue;

        public IntegerBox()
        {
            this.InitializeComponent();
        }



        private void txtLostFocus(object sender, RoutedEventArgs e)
        {
            if (!txtChanged) return;

            string txt = txtBox.Text;
            int ConvertedValue;

            bool didConvert = Int32.TryParse(txt, out ConvertedValue);
             
            if (didConvert)
            {
                if (!AllowNegativeNumber && (ConvertedValue < 0)) ConvertedValue *= -1;
                if (ConvertedValue > MaximumNumberAllowed) ConvertedValue = MaximumNumberAllowed;
                if (ConvertedValue < MinimumNumberAllowed) ConvertedValue = MinimumNumberAllowed;

                decimal oldValue = Value;
                Value = ConvertedValue;
                ValueManuallyChanged?.Invoke(this, new ValueChangedEventArgs()
                {
                    oldValue = oldValue,
                    newValue = ConvertedValue,
                    PropertyName = "Value"
                });
            }
            else
            {
                string newString = Value.ToString();
                txtBox.Text = newString;
            }
        }

        private void textChanged(object sender, TextChangedEventArgs e)
        {
            txtChanged = true;
        }






    }
}
