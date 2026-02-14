using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
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
    public sealed partial class EngrDecimalBoxDialog : UserControl, INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler PropertyChanged;
        public event ValueChangedEventHandler ValueManuallyChanged;

        public string VariableName { get; set; }
        public string Unit { get; set; }
        public string UnitShort { get; set; } = "";

        public delegate void ValueChangedEventHandler(object sender, ValueChangedEventArgs args);

        public decimal Value
        {
            get { return (decimal)GetValue(ValueProperty); }
            set
            {
                SetValue(ValueProperty, value);
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("Value"));
            }
        }

        public static readonly DependencyProperty ValueProperty =
            DependencyProperty.Register("Value",
                typeof(decimal), typeof(EngrDecimalBoxDialog), new PropertyMetadata(1m));

        public bool AllowNegativeNumber { get; set; }
        public bool AllowZero { get; set; }

        public EngrDecimalBoxDialog()
        {
            this.InitializeComponent();
        }


        private async void changeValue(object sender, RoutedEventArgs e)
        {
            StackPanel stk2 = new StackPanel() { Orientation = Orientation.Vertical };
            StackPanel stk = new StackPanel() { Orientation = Orientation.Horizontal };
            var converter = new DecimalEngrConverter();

            stk.Children.Add(new TextBlock()
            {
                Text = "New Value:",
                Margin = new Thickness(4),
                VerticalAlignment = VerticalAlignment.Center
            });
            
            var txtResource = Application.Current.Resources["EngrNumberBoxStyle"];
            InputScope inp = new InputScope();
            InputScopeName inpn = new InputScopeName();
            inpn.NameValue = InputScopeNameValue.AlphanumericFullWidth;
            inp.Names.Add(inpn);

            var txtValue = new TextBox()
            {
                Style = (Style)txtResource,
                IsSpellCheckEnabled = false,
                IsTextPredictionEnabled = false,
                AllowDrop = false,
                InputScope = inp,
                Text = (string)converter.Convert(Value, null, null, null)
            };

            stk.Children.Add(txtValue);
            stk.Children.Add(new TextBlock()
            {
                Text = UnitShort,
                Margin = new Thickness(4),
                VerticalAlignment = VerticalAlignment.Center
            });

            stk2.Children.Add(new TextBlock() { Text = "Engineering and Scientific notations allowed" });
            stk2.Children.Add(stk);
            if (!AllowNegativeNumber) stk2.Children.Add(new TextBlock()
            { Text = "Only Positive number allowed", FontStyle = Windows.UI.Text.FontStyle.Italic });
            if (!AllowZero) stk2.Children.Add(new TextBlock()
            { Text = "Zero value is not allowed", FontStyle = Windows.UI.Text.FontStyle.Italic });
            
            ContentDialog dialog = new ContentDialog()
            {
                Title = "Enter new Value" + Environment.NewLine +
                VariableName,
                Content = stk2,
                CloseButtonText = "Cancel",
                PrimaryButtonText = "OK"
            };

            ContentDialogResult result = await dialog.ShowAsync();

            if (result == ContentDialogResult.Primary)
            {
                decimal result2 = 0m;
                bool didConvert = false;

                try
                {
                    result2 = (decimal)converter.ConvertBack(txtValue.Text, null, null, null);
                    didConvert = true;
                }
                catch { }

                if (!didConvert) {
                    var invdialog = new Windows.UI.Popups.MessageDialog("Incorrect format value");
                    await invdialog.ShowAsync();
                    return;
                }

                if (result2 == 0 && !AllowZero) return;
                if (result2 < 0 && !AllowNegativeNumber) return;

                var args = new ValueChangedEventArgs
                {
                    oldValue = Value,
                    newValue = result2,
                    PropertyName = "Value"
                };

                Value = result2;
                ValueManuallyChanged?.Invoke(this, args);
            }
        }

    }
    
}
