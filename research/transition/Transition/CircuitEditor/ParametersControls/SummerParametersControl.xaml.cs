using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Commands;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.CustomControls;
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

namespace Easycoustics.Transition.CircuitEditor.ParametersControls
{
    public sealed partial class SummerParametersControl : UserControl
    {
        private Summer SerializableSummer { get; }
        private string oldElementName;

        public SummerParametersControl()
        {
            this.InitializeComponent();
        }

        public SummerParametersControl(Summer sum)
        {
            this.InitializeComponent();
            SerializableSummer = sum;

            sum.PropertyChanged += handleChangeOfControls;
            
            handleChangeOfControls(null, null);
        }

        private void handleChangeOfControls(object sender, PropertyChangedEventArgs args)
        {
            SerializableSummer.PropertyChanged -= handleChangeOfControls;

            txtElementName.TextChanged -= ElementNameChanged;
            txtElementName.Text = SerializableSummer.ElementName;
            txtElementName.TextChanged += ElementNameChanged;

            chkInvertA.Checked   -= chkInvertAChecked;
            chkInvertA.Unchecked -= chkInvertAUnChecked;
            chkInvertA.IsChecked =  SerializableSummer.InAInverterInput;
            chkInvertA.Checked   += chkInvertAChecked;
            chkInvertA.Unchecked += chkInvertAUnChecked;

            chkInvertB.Checked   -= chkInvertBChecked;
            chkInvertB.Unchecked -= chkInvertBUnChecked;
            chkInvertB.IsChecked =  SerializableSummer.InBInverterInput;
            chkInvertB.Checked   += chkInvertBChecked;
            chkInvertB.Unchecked += chkInvertBUnChecked;

            chkInvertC.Checked   -= chkInvertCChecked;
            chkInvertC.Unchecked -= chkInvertCUnChecked;
            chkInvertC.IsChecked =  SerializableSummer.InCInverterInput;
            chkInvertC.Checked   += chkInvertCChecked;
            chkInvertC.Unchecked += chkInvertCUnChecked;

            cmbQuantityOfInputs.SelectionChanged -= cmbQuantityInputsChanged;
            cmbQuantityOfInputs.SelectedIndex = SerializableSummer.QuantityOfTerminals - 3;
            cmbQuantityOfInputs.SelectionChanged += cmbQuantityInputsChanged;

            boxRIn.Value = SerializableSummer.RIn;
            boxROut.Value = SerializableSummer.ROut;

            chkInvertC.IsEnabled = (SerializableSummer.QuantityOfTerminals > 3);

            SerializableSummer.PropertyChanged += handleChangeOfControls;

        }


        private void cmbQuantityInputsChanged(object sender, SelectionChangedEventArgs e)
        {
            byte newValue = (byte)(cmbQuantityOfInputs.SelectedIndex + 3);

            var command = new CommandSetValue()
            {
                Component = SerializableSummer,
                Property = "QuantityOfTerminals",
                OldValue = SerializableSummer.QuantityOfTerminals,
                NewValue = newValue
            };

            executeCommand(command);
        }

        private void chkInvertAChecked(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSummer,
                Property = "InAInverterInput",
                OldValue = SerializableSummer.InAInverterInput,
                NewValue = true
            };

            executeCommand(command);
        }

        private void chkInvertAUnChecked(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSummer,
                Property = "InAInverterInput",
                OldValue = SerializableSummer.InAInverterInput,
                NewValue = false
            };

            executeCommand(command);
        }

        private void chkInvertBChecked(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSummer,
                Property = "InBInverterInput",
                OldValue = SerializableSummer.InBInverterInput,
                NewValue = true
            };

            executeCommand(command);
        }

        private void chkInvertBUnChecked(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSummer,
                Property = "InBInverterInput",
                OldValue = SerializableSummer.InBInverterInput,
                NewValue = false
            };

            executeCommand(command);
        }

        
        private void chkInvertCChecked(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSummer,
                Property = "InCInverterInput",
                OldValue = SerializableSummer.InCInverterInput,
                NewValue = true
            };

            executeCommand(command);
        }

        private void chkInvertCUnChecked(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSummer,
                Property = "InCInverterInput",
                OldValue = SerializableSummer.InCInverterInput,
                NewValue = false
            };

            executeCommand(command);
        }

        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableSummer,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }


        private void RInChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSummer,
                Property = "RIn",
                OldValue = SerializableSummer.RIn,
                NewValue = boxRIn.Value
            };

            executeCommand(command);
        }

        private void ROutChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSummer,
                Property = "ROut",
                OldValue = SerializableSummer.ROut,
                NewValue = boxROut.Value
            };

            executeCommand(command);
        }


        private void ElementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = SerializableSummer.ElementName;
        }

        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }
        
    }
}
